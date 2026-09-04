"""Fixed-window rate limiting over the shared store.

There was no rate limiting anywhere, while ten `/gemini/*` endpoints were
public and each spent money — a single script could drain the quota, or the
bill, in minutes.

Backed by `KeyValueStore`, so it is per-process with the in-memory store and
correct across replicas the moment `REDIS_URL` is set, with no code change.
A fixed window is deliberate: it costs one counter per subject and cannot be
walked forward by a steady request stream the way a naive sliding window can.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple

from app.core.errors import RateLimited
from app.core import metrics
from app.core.logging import get_logger
from app.core.store import get_store

log = get_logger(__name__)


@dataclass(frozen=True)
class Limit:
    times: int
    seconds: int

    @classmethod
    def parse(cls, spec: str) -> "Limit":
        """Parse "10/300" as ten requests per five minutes."""
        try:
            times, seconds = spec.split("/")
            return cls(int(times), int(seconds))
        except (ValueError, AttributeError) as exc:
            raise ValueError(f"invalid rate limit spec: {spec!r}") from exc

    def __str__(self) -> str:
        return f"{self.times}/{self.seconds}s"


async def check(bucket: str, subject: str, limit: Limit, *, cost: int = 1) -> Tuple[int, int]:
    """Consume `cost` from a bucket. Raises `RateLimited` when exhausted.

    Returns (used, remaining).
    """
    key = f"rl:{bucket}:{subject}"
    store = get_store()
    used = 0
    for _ in range(max(1, cost)):
        used = await store.incr(key, limit.seconds)
    if used > limit.times:
        # Approximate: the window's true remaining time is not exposed by the
        # interface, and over-reporting would be worse than under-reporting.
        metrics.inc("vaadvivaad_ratelimit_blocked_total", bucket=bucket)
        log.warning("ratelimit.blocked",
                    extra={"bucket": bucket, "subject": subject[:40],
                           "used": used, "limit": str(limit)})
        raise RateLimited(retry_after=limit.seconds)
    return used, max(0, limit.times - used)


async def peek(bucket: str, subject: str) -> int:
    raw = await get_store().get(f"rl:{bucket}:{subject}")
    return int(raw) if raw is not None else 0


async def reset(bucket: str, subject: str) -> None:
    await get_store().delete(f"rl:{bucket}:{subject}")


def client_ip(request) -> str:
    """Best-effort client address.

    Uvicorn runs with `--proxy-headers`, so `X-Forwarded-For` is populated by
    the reverse proxy. The leftmost entry is the original client; it is
    spoofable if the proxy does not overwrite it, which is why this is only
    ever used for coarse anti-abuse limits and never for authorisation.
    """
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return getattr(getattr(request, "client", None), "host", "unknown") or "unknown"
