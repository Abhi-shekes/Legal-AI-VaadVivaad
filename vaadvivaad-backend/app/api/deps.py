"""Shared FastAPI dependencies: identity and rate limiting."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from fastapi import Depends, Request

from app.auth import tokens
from app.core import ratelimit
from app.core.config import settings
from app.core.errors import NotAuthenticated
from app.core.logging import bind


@dataclass(frozen=True)
class Identity:
    user_id: str
    email: str
    role: str = "user"


def _read_token(request: Request) -> Optional[str]:
    """Cookie first, then bearer.

    The cookie is httpOnly and is what the SPA uses; the bearer header exists
    so the API is usable from a script or a test without cookie plumbing.
    """
    cookie = request.cookies.get("token")
    if cookie:
        return cookie
    header = request.headers.get("authorization", "")
    if header.lower().startswith("bearer "):
        return header[7:].strip()
    return None


async def current_user(request: Request) -> Identity:
    """Require a signed-in user. Raises 401 otherwise."""
    raw = _read_token(request)
    if not raw:
        raise NotAuthenticated("no credentials")
    payload = tokens.decode(raw, expected_type=tokens.ACCESS)
    identity = Identity(
        user_id=payload["sub"],
        email=payload.get("email", ""),
        role=payload.get("role", "user"),
    )
    bind(user_id=identity.user_id)
    return identity


async def optional_user(request: Request) -> Optional[Identity]:
    try:
        return await current_user(request)
    except NotAuthenticated:
        return None


# ── Rate limit dependencies ──────────────────────────────────────────────

async def limit_auth(request: Request) -> None:
    """Per-IP, for unauthenticated endpoints where the subject is unknown."""
    await ratelimit.check("auth", ratelimit.client_ip(request),
                          ratelimit.Limit.parse(settings.RATELIMIT_AUTH))


async def limit_api(identity: Identity = Depends(current_user)) -> Identity:
    """General authenticated API budget, per user."""
    await ratelimit.check("api", identity.user_id,
                          ratelimit.Limit.parse(settings.RATELIMIT_API))
    return identity


async def limit_debate(identity: Identity = Depends(current_user)) -> Identity:
    """Debates are the expensive operation; they get their own budget.

    This is the control that was entirely absent while ten public endpoints
    each spent money on every call.
    """
    await ratelimit.check("debate", identity.user_id,
                          ratelimit.Limit.parse(settings.RATELIMIT_DEBATE))
    return identity
