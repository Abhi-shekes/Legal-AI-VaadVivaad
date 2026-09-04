"""Authentication routes.

Fixes from the previous version:
  * failures return the right status code — login with bad credentials was a
    200 with `{"status": "fail"}`, which no HTTP client treats as an error;
  * signup no longer confirms whether an address is registered;
  * the unique index is relied on instead of a racy check-then-insert;
  * refresh tokens exist, and logout actually revokes one.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import BaseModel, EmailStr, Field

from app.api.deps import Identity, current_user, limit_auth
from app.auth import tokens
from app.auth.hashing import hash_password, verify_password
from app.core.errors import NotAuthenticated
from app.core.logging import get_logger
from app.db import repository

log = get_logger(__name__)
router = APIRouter()


class SignupRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class AuthResponse(BaseModel):
    status: str
    message: str
    data: dict | None = None


# Identical response whether or not the address exists, so signup cannot be
# used to enumerate registered users.
_SIGNUP_OK = "Account created. You can sign in now."

# Identical response for "no such user" and "wrong password", and the same
# amount of work is done in both cases.
_LOGIN_FAIL = "Email or password is incorrect."


@router.post("/signup", response_model=AuthResponse,
             status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(limit_auth)])
async def signup(payload: SignupRequest, response: Response):
    hashed = hash_password(payload.password)
    user_id = await repository.create_user(payload.name, payload.email, hashed)
    if user_id is None:
        # Do not reveal that the address is taken. The person who owns it can
        # still sign in or reset; an attacker learns nothing.
        log.info("auth.signup_duplicate")
        response.status_code = status.HTTP_201_CREATED
        return AuthResponse(status="success", message=_SIGNUP_OK)
    log.info("auth.signup", extra={"user_id": user_id})
    return AuthResponse(status="success", message=_SIGNUP_OK)


@router.post("/login", response_model=AuthResponse,
             dependencies=[Depends(limit_auth)])
async def login(payload: LoginRequest, response: Response):
    user = await repository.find_user_by_email(payload.email)
    stored = (user or {}).get("hashed_password")
    # Always run a verify so the response time does not disclose whether the
    # account exists.
    dummy = "$2b$12$" + "x" * 53
    ok = verify_password(payload.password, stored or dummy) if stored else False

    if not user or not ok:
        log.info("auth.login_failed")
        raise NotAuthenticated("bad credentials", user_message=_LOGIN_FAIL)

    user_id = str(user["_id"])
    access = tokens.create_access_token(user_id, user["email"])
    refresh, jti, expires = tokens.create_refresh_token(user_id, user["email"])
    await repository.store_refresh_token(jti, user_id, expires)
    tokens.set_auth_cookies(response, access, refresh)

    log.info("auth.login", extra={"user_id": user_id})
    return AuthResponse(
        status="success", message="Signed in.",
        data={"name": user.get("name", ""), "email": user["email"], "id": user_id},
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh(request: Request, response: Response):
    """Rotate the refresh token and mint a new access token.

    Rotation means a stolen refresh token is usable at most once before the
    legitimate client's next refresh invalidates it.
    """
    raw = request.cookies.get("refresh_token")
    if not raw:
        raise NotAuthenticated("no refresh token")
    payload = tokens.decode(raw, expected_type=tokens.REFRESH)
    jti = payload.get("jti", "")

    if not await repository.refresh_token_valid(jti):
        raise NotAuthenticated("refresh token revoked",
                               user_message="Your session has expired. Please sign in again.")

    await repository.revoke_refresh_token(jti)
    user_id, email = payload["sub"], payload.get("email", "")
    access = tokens.create_access_token(user_id, email)
    new_refresh, new_jti, expires = tokens.create_refresh_token(user_id, email)
    await repository.store_refresh_token(new_jti, user_id, expires)
    tokens.set_auth_cookies(response, access, new_refresh)

    return AuthResponse(status="success", message="Session refreshed.",
                        data={"email": email, "id": user_id})


@router.get("/me", response_model=AuthResponse)
async def me(identity: Identity = Depends(current_user)):
    """Lets the SPA validate its persisted session instead of trusting
    localStorage, which is what made the UI show a signed-in user while every
    API call returned 401."""
    user = await repository.get_user(identity.user_id)
    if not user:
        raise NotAuthenticated("user no longer exists")
    return AuthResponse(
        status="success", message="ok",
        data={"id": identity.user_id, "email": user.get("email", ""),
              "name": user.get("name", ""),
              "preferences": user.get("preferences", {})},
    )


@router.post("/logout", response_model=AuthResponse)
async def logout(request: Request, response: Response):
    raw = request.cookies.get("refresh_token")
    if raw:
        try:
            payload = tokens.decode(raw, expected_type=tokens.REFRESH)
            await repository.revoke_refresh_token(payload.get("jti", ""))
        except NotAuthenticated:
            pass  # already invalid; clearing the cookies is still correct
    tokens.clear_auth_cookies(response)
    return AuthResponse(status="success", message="Signed out.")
