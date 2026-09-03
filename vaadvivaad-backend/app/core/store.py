"""Key/value store behind sessions, the LLM cache and rate limiting.

`case_data_store = {}` — a module-level dict — was what pinned the deployment
to a single replica: two workers could not share it, a restart dropped every
in-flight debate, and a client whose socket landed on a different worker than
its POST got "Session data not found".

This provides one interface with two backends. `RedisStore` is selected
automatically when `REDIS_URL` is set and the `redis` package is importable;
otherwise `InMemoryStore` runs, which is correct for a single instance and for
tests. Application code never knows which it got.
"""

from __future__ import annotations

import abc
import asyncio
import json
import time
from typing import Any, Dict, Optional, Tuple

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)


class KeyValueStore(abc.ABC):
    """Minimal async KV surface: enough for sessions, caching and counters."""

    @abc.abstractmethod
    async def get(self, key: str) -> Optional[str]: ...

    @abc.abstractmethod
    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> None: ...

    @abc.abstractmethod
    async def delete(self, key: str) -> None: ...

    @abc.abstractmethod
    async def incr(self, key: str, ttl: int) -> int:
        """Increment a counter, setting the TTL on first write. Returns the
        new value. Used by the rate limiter, so it must be atomic."""

    @abc.abstractmethod
    async def close(self) -> None: ...

    # ── JSON convenience ─────────────────────────────────────────────────

    async def get_json(self, key: str) -> Optional[Any]:
        raw = await self.get(key)
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (TypeError, ValueError):
            log.warning("store.corrupt_json", extra={"key": key})
            await self.delete(key)
            return None

    async def set_json(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        await self.set(key, json.dumps(value, default=str), ttl=ttl)


class InMemoryStore(KeyValueStore):
    """Process-local store with lazy TTL expiry.

    Single-instance correct. Deliberately not silently "good enough" for
    multi-replica: `main.py` warns at startup when this is in use in
    production.
    """

    def __init__(self) -> None:
        # key -> (value, expires_at | None)
        self._data: Dict[str, Tuple[str, Optional[float]]] = {}
        self._lock = asyncio.Lock()

    def _live(self, key: str) -> Optional[str]:
        entry = self._data.get(key)
        if entry is None:
            return None
        value, expires = entry
        if expires is not None and expires <= time.monotonic():
            self._data.pop(key, None)
            return None
        return value

    async def get(self, key: str) -> Optional[str]:
        async with self._lock:
            return self._live(key)

    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> None:
        async with self._lock:
            expires = time.monotonic() + ttl if ttl is not None else None
            self._data[key] = (value, expires)
            if len(self._data) > 10_000:
                self._sweep()

    async def delete(self, key: str) -> None:
        async with self._lock:
            self._data.pop(key, None)

    async def incr(self, key: str, ttl: int) -> int:
        async with self._lock:
            current = self._live(key)
            value = int(current) + 1 if current is not None else 1
            # Preserve the original window: re-setting the TTL on every hit
            # would let a steady stream of requests slide the window forever.
            expires = self._data[key][1] if current is not None else time.monotonic() + ttl
            self._data[key] = (str(value), expires)
            return value

    def _sweep(self) -> None:
        now = time.monotonic()
        for key in [k for k, (_, e) in self._data.items() if e is not None and e <= now]:
            self._data.pop(key, None)

    async def close(self) -> None:
        self._data.clear()


class RedisStore(KeyValueStore):
    """Redis-backed store. Used when REDIS_URL is set and `redis` is present."""

    def __init__(self, url: str) -> None:
        import redis.asyncio as redis  # imported lazily; optional dependency

        self._redis = redis.from_url(url, encoding="utf-8", decode_responses=True)

    async def get(self, key: str) -> Optional[str]:
        return await self._redis.get(key)

    async def set(self, key: str, value: str, ttl: Optional[int] = None) -> None:
        await self._redis.set(key, value, ex=ttl)

    async def delete(self, key: str) -> None:
        await self._redis.delete(key)

    async def incr(self, key: str, ttl: int) -> int:
        # Pipelined so the increment and its first-write expiry are one
        # round trip; NX on EXPIRE keeps the window fixed rather than sliding.
        pipe = self._redis.pipeline()
        pipe.incr(key)
        pipe.expire(key, ttl, nx=True)
        value, _ = await pipe.execute()
        return int(value)

    async def close(self) -> None:
        await self._redis.aclose()


_store: Optional[KeyValueStore] = None


def _build_store() -> KeyValueStore:
    if settings.REDIS_URL:
        try:
            store = RedisStore(settings.REDIS_URL)
            log.info("store.redis", extra={"url": settings.REDIS_URL.split("@")[-1]})
            return store
        except ImportError:
            log.error(
                "store.redis_unavailable",
                extra={"detail": "REDIS_URL is set but the `redis` package is not "
                                 "installed; falling back to in-memory"},
            )
        except Exception as exc:  # pragma: no cover - connection shapes vary
            log.error("store.redis_failed", extra={"error": str(exc)})
    if settings.is_production:
        log.warning(
            "store.in_memory_in_production",
            extra={"detail": "sessions and rate limits are per-process; run a "
                             "single replica or set REDIS_URL"},
        )
    return InMemoryStore()


def get_store() -> KeyValueStore:
    global _store
    if _store is None:
        _store = _build_store()
    return _store


def set_store(store: Optional[KeyValueStore]) -> None:
    """Test seam."""
    global _store
    _store = store


async def close_store() -> None:
    global _store
    if _store is not None:
        await _store.close()
        _store = None
