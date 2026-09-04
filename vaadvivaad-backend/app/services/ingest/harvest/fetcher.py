"""A polite HTTP client for harvesting public legal corpora.

The sources this talks to are free, official, publicly funded publishers
running on modest infrastructure. Hammering them would be both rude and the
fastest way to get the project blocked, so every request goes through here
and every request is:

  * **checked against robots.txt**, cached per host;
  * **rate limited per host**, so concurrency across hosts never becomes
    concurrency against one host;
  * **conditionally cached on disk** by ETag / Last-Modified, so re-running a
    harvest costs almost nothing and a resumed run does not re-download what
    it already has;
  * **retried with backoff** on timeouts and 5xx, and *not* retried on 4xx,
    which will not get better by asking again.

`fetch()` returning None means "nothing usable" — not found, disallowed, or
still failing after the retries. Callers skip and carry on; a harvest is
resumable and a missing document is not a reason to abort.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import time
import urllib.robotparser
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Optional
from urllib.parse import urlparse

import httpx

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)


@dataclass
class Response:
    url: str
    status: int
    text: str
    from_cache: bool = False

    def json(self):
        return json.loads(self.text)


class _HostLimiter:
    """One in-flight request per host, spaced by a minimum interval.

    Deliberately not a token bucket: burst allowance is exactly what you do
    not want against a government portal. This is the simplest thing that
    guarantees a floor on the gap between two requests to the same host.
    """

    def __init__(self, min_interval: float) -> None:
        self._min_interval = min_interval
        self._locks: Dict[str, asyncio.Lock] = {}
        self._last: Dict[str, float] = {}

    async def wait(self, host: str) -> None:
        lock = self._locks.setdefault(host, asyncio.Lock())
        async with lock:
            elapsed = time.monotonic() - self._last.get(host, 0.0)
            if elapsed < self._min_interval:
                await asyncio.sleep(self._min_interval - elapsed)
            self._last[host] = time.monotonic()


class PoliteFetcher:
    def __init__(self, *, cache_dir: Optional[Path] = None,
                 min_interval: Optional[float] = None,
                 user_agent: Optional[str] = None) -> None:
        self._cache = Path(cache_dir or settings.HARVEST_CACHE_DIR)
        self._limiter = _HostLimiter(
            min_interval if min_interval is not None
            else settings.HARVEST_MIN_INTERVAL_SECONDS
        )
        self._agent = user_agent or settings.HARVEST_USER_AGENT
        self._robots: Dict[str, Optional[urllib.robotparser.RobotFileParser]] = {}
        self._robots_lock = asyncio.Lock()
        self._client: Optional[httpx.AsyncClient] = None
        self._cache_broken = False
        self.stats = {"fetched": 0, "cached": 0, "blocked": 0, "failed": 0}

    # ── lifecycle ────────────────────────────────────────────────────────

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                timeout=settings.HARVEST_TIMEOUT_SECONDS,
                follow_redirects=True,
                headers={"User-Agent": self._agent},
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> "PoliteFetcher":
        return self

    async def __aexit__(self, *_exc) -> None:
        await self.aclose()

    # ── robots ───────────────────────────────────────────────────────────

    async def _allowed(self, url: str) -> bool:
        parsed = urlparse(url)
        host = parsed.netloc
        async with self._robots_lock:
            if host not in self._robots:
                self._robots[host] = await self._load_robots(
                    f"{parsed.scheme}://{host}/robots.txt"
                )
        parser = self._robots[host]
        if parser is None:
            # No rules published, or they could not be read. The stdlib
            # parser treats an unreadable robots.txt as permissive and so do
            # we; the rate limit above is what actually protects the host.
            return True
        return parser.can_fetch(self._agent, url)

    async def _load_robots(self, url: str):
        try:
            response = await self._http().get(url)
        except Exception as exc:
            log.debug("harvest.robots_unreachable",
                      extra={"url": url, "error": str(exc)[:120]})
            return None

        if response.status_code in (401, 403):
            # An explicit refusal to serve the rules is a refusal to be
            # crawled. Treat the whole host as disallowed.
            parser = urllib.robotparser.RobotFileParser()
            parser.disallow_all = True
            log.warning("harvest.robots_forbidden", extra={"url": url})
            return parser
        if response.status_code >= 400:
            return None  # no rules published

        parser = urllib.robotparser.RobotFileParser()
        parser.parse(response.text.splitlines())
        return parser

    # ── disk cache ───────────────────────────────────────────────────────

    def _slot(self, url: str) -> Path:
        digest = hashlib.sha256(url.encode("utf-8")).hexdigest()
        # Two levels of fan-out: a flat directory of 100k files is miserable
        # to work with and slow on some filesystems.
        return self._cache / digest[:2] / digest[2:4] / f"{digest}.json"

    def _read_cache(self, url: str) -> Optional[dict]:
        slot = self._slot(url)
        if not slot.exists():
            return None
        try:
            return json.loads(slot.read_text(encoding="utf-8"))
        except Exception:
            return None

    def _write_cache(self, url: str, status: int, text: str,
                     headers: httpx.Headers) -> None:
        """Best effort. The cache is an optimisation, never a dependency.

        An unwritable cache directory -- a read-only mount, a volume owned by
        root while the process runs as `vaadvivaad` -- used to raise straight
        through `fetch()` and abandon the whole harvest. Now it costs a
        warning, once, and the run continues over the network.
        """
        slot = self._slot(url)
        try:
            slot.parent.mkdir(parents=True, exist_ok=True)
            slot.write_text(
                json.dumps({
                    "url": url,
                    "status": status,
                    "text": text,
                    "etag": headers.get("etag", ""),
                    "last_modified": headers.get("last-modified", ""),
                    "stored_at": time.time(),
                }),
                encoding="utf-8",
            )
        except OSError as exc:
            if not self._cache_broken:
                self._cache_broken = True
                log.warning("harvest.cache_unwritable",
                            extra={"dir": str(self._cache), "error": str(exc)[:140],
                                   "effect": "harvest continues without caching, "
                                             "so a re-run will re-fetch"})

    # ── fetch ────────────────────────────────────────────────────────────

    async def fetch(self, url: str, *, params: Optional[dict] = None,
                    revalidate: bool = True) -> Optional[Response]:
        """GET a URL through the cache, the limiter and the robots check.

        `revalidate=False` returns a cached copy without asking the server at
        all — the right choice for statute text, which does not change
        between two runs of the same harvest.
        """
        full = str(httpx.URL(url, params=params)) if params else url

        if not await self._allowed(full):
            self.stats["blocked"] += 1
            log.warning("harvest.disallowed", extra={"url": full[:200]})
            return None

        cached = self._read_cache(full)
        if cached and not revalidate:
            self.stats["cached"] += 1
            return Response(full, cached["status"], cached["text"], from_cache=True)

        headers = {}
        if cached:
            if cached.get("etag"):
                headers["If-None-Match"] = cached["etag"]
            if cached.get("last_modified"):
                headers["If-Modified-Since"] = cached["last_modified"]

        host = urlparse(full).netloc
        delay = 1.0
        for attempt in range(1, settings.HARVEST_MAX_RETRIES + 1):
            await self._limiter.wait(host)
            try:
                response = await self._http().get(full, headers=headers)
            except Exception as exc:
                log.debug("harvest.request_failed",
                          extra={"url": full[:200], "attempt": attempt,
                                 "error": str(exc)[:120]})
                if attempt == settings.HARVEST_MAX_RETRIES:
                    self.stats["failed"] += 1
                    return None
                await asyncio.sleep(delay)
                delay *= 2
                continue

            if response.status_code == 304 and cached:
                self.stats["cached"] += 1
                return Response(full, cached["status"], cached["text"],
                                from_cache=True)

            if response.status_code == 429 or response.status_code >= 500:
                # Honour Retry-After when the server sends one; it knows
                # better than our backoff curve does.
                wait = delay
                retry_after = response.headers.get("retry-after")
                if retry_after and retry_after.isdigit():
                    wait = min(float(retry_after), 60.0)
                if attempt == settings.HARVEST_MAX_RETRIES:
                    self.stats["failed"] += 1
                    log.warning("harvest.giving_up",
                                extra={"url": full[:200],
                                       "status": response.status_code})
                    return None
                await asyncio.sleep(wait)
                delay *= 2
                continue

            if response.status_code >= 400:
                # A 404 will not become a 200 by asking again.
                self.stats["failed"] += 1
                log.debug("harvest.not_available",
                          extra={"url": full[:200], "status": response.status_code})
                return None

            self.stats["fetched"] += 1
            self._write_cache(full, response.status_code, response.text,
                              response.headers)
            return Response(full, response.status_code, response.text)

        return None
