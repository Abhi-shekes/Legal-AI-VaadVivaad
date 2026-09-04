"""Access and refresh token issuance.

Previously there was one 30-minute token with no refresh: a debate that
outlived it failed to save with a silent 401 while the frontend still showed
the user as signed in, and `logout` deleted a cookie without invalidating
anything server-side.

Now: a short access token, a long refresh token whose `jti` is recorded in
Mongo so it can actually be revoked, and rotation on every refresh.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from jose import JWTError, jwt

from app.core.config import settings
from app.core.errors import NotAuthenticated

ACCESS = "access"
REFRESH = "refresh"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def create_access_token(user_id: str, email: str, role: str = "user") -> str:
    now = _now()
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": ACCESS,
        "iat": now,
        "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: str, email: str) -> Tuple[str, str, datetime]:
    """Returns (token, jti, expires_at). The jti is stored so logout works."""
    now = _now()
    jti = uuid.uuid4().hex
    expires = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": user_id, "email": email, "type": REFRESH,
        "jti": jti, "iat": now, "exp": expires,
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return token, jti, expires


def decode(token: str, *, expected_type: Optional[str] = None) -> Dict[str, Any]:
    try:
        payload = jwt.decode(
            token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
        )
    except JWTError as exc:
        raise NotAuthenticated(f"invalid token: {exc}") from exc
    if expected_type and payload.get("type") != expected_type:
        # Without this an access token would be usable as a refresh token and
        # vice versa, which turns a 15-minute credential into a 14-day one.
        raise NotAuthenticated("wrong token type")
    if not payload.get("sub"):
        raise NotAuthenticated("token has no subject")
    return payload


def set_auth_cookies(response, access: str, refresh: str) -> None:
    common = {
        "httponly": True,
        "secure": settings.COOKIE_SECURE,
        "samesite": settings.COOKIE_SAMESITE,
        "path": "/",
    }
    response.set_cookie("token", access,
                        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60, **common)
    response.set_cookie("refresh_token", refresh,
                        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400, **common)


def clear_auth_cookies(response) -> None:
    for name in ("token", "refresh_token"):
        response.delete_cookie(name, path="/")
