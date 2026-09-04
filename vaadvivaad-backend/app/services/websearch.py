"""Live grounding for anything the corpus does not have.

The corpus is a snapshot. A judgment handed down last month, an amendment
notified this year, a section renumbered by the 2023 codes — none of it
exists for `find_precedents()`, which correctly returns nothing and lets the
hearing argue from statute alone.

This does *not* fix that by feeding the web to counsel. It is a separate
lane, and the separation is the whole design:

  * Results are **never citable**. `verified` is False by construction, they
    are not `Precedent` objects, and nothing here reaches `DebateContext`.
    `citations.verify_turn()` checks every authority a turn relies on against
    the retrieved shortlist, so a model that saw a web result and cited it
    would have that citation stripped — which is exactly the behaviour we
    want and the reason this cannot quietly become a grounding source.
  * Results are **shown to the person**, in a panel the UI labels as outside
    the record, so a practitioner can follow a lead the corpus missed and
    decide for themselves.
  * Only an **allowlist of official publishers** is searched. An open web
    search over Indian criminal law returns content farms, and a content farm
    with a confident tone is worse than no result.

SearXNG is a metasearch front end: it queries public engines and returns
their results, holds no index, sets no API key, and runs in one container. It
is the only part of this that talks to the open internet.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx

from app.core.config import settings
from app.core.logging import Timer, get_logger

log = get_logger(__name__)

# Free, official or freely-published sources of Indian law. Anything not on
# this list is dropped after the search rather than filtered in the query,
# because engines honour a `site:` operator inconsistently and one that
# ignores it would otherwise leak the whole web through.
DEFAULT_ALLOWLIST = (
    "sci.gov.in",
    "main.sci.gov.in",
    "digiscr.sci.gov.in",
    "judgments.ecourts.gov.in",
    "ecourts.gov.in",
    "indiacode.gov.in",
    "indiacode.nic.in",
    "egazette.gov.in",
    "egazette.nic.in",
    "prsindia.org",
    "indiankanoon.org",
)

_MAX_RESULTS = 8


def allowlist() -> List[str]:
    configured = [d.strip().lower() for d in settings.WEBSEARCH_ALLOWLIST.split(",")
                  if d.strip()]
    return configured or list(DEFAULT_ALLOWLIST)


def is_allowed(url: str, allowed: Optional[List[str]] = None) -> bool:
    """Host must equal an allowed domain or be a subdomain of one.

    Matching on the parsed host, not a substring of the URL: a substring test
    would accept `https://evil.example.com/?q=sci.gov.in`.
    """
    allowed = allowed if allowed is not None else allowlist()
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        return False
    if not host:
        return False
    return any(host == domain or host.endswith("." + domain) for domain in allowed)


def build_query(summary: str, sections: List[str] = (), crime_type: str = "") -> str:
    """A short keyword query, not the whole narrative.

    Search engines do badly with a paragraph. Sections and offence type are
    the discriminating tokens, and the first clause of the summary supplies
    the subject matter.
    """
    parts: List[str] = []
    if sections:
        parts.extend(f"section {s}" for s in list(sections)[:2])
    if crime_type:
        parts.append(crime_type)
    head = " ".join((summary or "").split()[:12])
    if head:
        parts.append(head)
    parts.append("judgment India")
    return " ".join(parts)[:300]


class SearxngClient:
    def __init__(self, base_url: str) -> None:
        self._base = (base_url or "").rstrip("/")
        self._client: Optional[httpx.AsyncClient] = None

    def configured(self) -> bool:
        return bool(self._base)

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self._base,
                timeout=settings.WEBSEARCH_TIMEOUT_SECONDS,
                headers={"User-Agent": settings.HARVEST_USER_AGENT},
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def raw_search(self, query: str) -> List[Dict[str, Any]]:
        """Returns [] on any failure. Live grounding is never load-bearing."""
        if not self.configured() or not query.strip():
            return []
        try:
            response = await self._http().get(
                "/search",
                params={"q": query, "format": "json", "language": "en",
                        "safesearch": "0"},
            )
            response.raise_for_status()
            return response.json().get("results", []) or []
        except Exception as exc:
            log.warning("websearch.failed",
                        extra={"error": str(exc)[:180],
                               "hint": "SearXNG must have `json` in search.formats"})
            return []


_client: Optional[SearxngClient] = None


def get_client() -> SearxngClient:
    global _client
    if _client is None:
        _client = SearxngClient(settings.SEARXNG_URL)
    return _client


def set_client(client: Optional[SearxngClient]) -> None:
    """Test seam."""
    global _client
    _client = client


async def close_client() -> None:
    if _client is not None:
        await _client.aclose()


def shape(results: List[Dict[str, Any]], *, limit: int = _MAX_RESULTS
          ) -> List[Dict[str, Any]]:
    """Allowlist, de-duplicate and trim. Everything comes back unverified."""
    allowed = allowlist()
    seen = set()
    out: List[Dict[str, Any]] = []
    for item in results:
        url = (item.get("url") or "").strip()
        if not url or url in seen or not is_allowed(url, allowed):
            continue
        seen.add(url)
        out.append({
            "title": (item.get("title") or "").strip()[:200],
            "url": url,
            "snippet": (item.get("content") or "").strip()[:400],
            "publisher": (urlparse(url).hostname or "").lower(),
            # Structural, not a flag someone can flip. Nothing in this module
            # can produce a verified result, and the UI keys off it.
            "verified": False,
            "citable": False,
        })
        if len(out) >= limit:
            break
    return out


async def find_outside_the_record(
    summary: str,
    *,
    sections: List[str] = (),
    crime_type: str = "",
    limit: int = _MAX_RESULTS,
) -> Dict[str, Any]:
    """Search the official publishers for material the corpus does not hold.

    The return shape carries its own disclaimer so a caller cannot render
    these as authority by accident.
    """
    client = get_client()
    if not client.configured():
        return {"available": False, "results": [], "query": "",
                "note": "Live search is not configured."}

    query = build_query(summary, sections, crime_type)
    with Timer() as timer:
        raw = await client.raw_search(query)
    results = shape(raw, limit=limit)
    log.info("websearch.results",
             extra={"raw": len(raw), "kept": len(results), "ms": timer.ms})

    return {
        "available": True,
        "query": query,
        "results": results,
        "sources": allowlist(),
        "note": ("Found outside the record. Not evidence, not before the bench, "
                 "and not citable by counsel — verify anything here yourself "
                 "before relying on it."),
    }
