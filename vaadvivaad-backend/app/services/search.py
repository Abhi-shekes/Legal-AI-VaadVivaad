"""Search over a user's own record of hearings.

`list_debates()` is a `find()` with `limit=50` sorted by date. That is a
recent-items list, not a way to find the matter you argued in March about a
dying declaration — and MongoDB Community has no Atlas Search to reach for.

Two backends behind one interface:

* **Meilisearch** when `MEILI_URL` is set. Typo-tolerant, sub-50ms, and it
  searches the whole record — every turn, the order, the questions put to the
  bench afterwards — with facets on section, code and outcome.

* **MongoDB text index** otherwise, so the endpoint works on a default
  install with no extra container. It is honestly worse: a Mongo text index
  covers the fields it was built on, so this one finds a case by its
  description and offence but *not* by something counsel said in the third
  round. `backend_name()` reports which one answered, and the UI says so.

**Tenancy.** Every document carries `user_id` and every query is filtered on
it server-side. The browser never talks to the search engine and the key
never leaves the backend, so a Meilisearch tenant token would add a second
lock on a door the public cannot reach; if the frontend is ever pointed
straight at Meilisearch, that is the moment to mint one.

Indexing happens when a hearing reaches a terminal stage, not after every
turn: an in-progress debate is already on the dashboard, and re-indexing a
growing transcript eight times per hearing is work nobody asked for.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)

INDEX = "cases"

# Stages after which the record is worth indexing. Anything earlier is still
# moving and is reachable from the dashboard anyway.
#
# Taken from `debate.machine.Stage` rather than written out by hand: the
# first version of this guessed "concluded" and silently indexed nothing,
# because the enum's terminal value is DONE. Importing it means a renamed
# stage breaks loudly here instead of quietly emptying the index.
def _terminal_stages() -> set:
    from app.services.debate.machine import Stage

    return {Stage.DONE.value, Stage.FAILED.value}


TERMINAL_STAGES = _terminal_stages()

_FILTERABLE = ["user_id", "sections", "codes", "outcome", "stage", "year"]
_SORTABLE = ["created_at_ts"]
_SEARCHABLE = ["title", "summary", "crime_type", "sections", "transcript", "ruling"]


# ── document shaping ─────────────────────────────────────────────────────

def build_document(state: Dict[str, Any]) -> Dict[str, Any]:
    """Flatten a stored debate into one search document.

    The transcript is concatenated rather than indexed per turn: a person
    looking for a matter wants the matter, and returning six turns of the
    same hearing as six results is a worse answer than returning the hearing.
    """
    case = state.get("case") or {}
    sections = state.get("sections") or []
    ruling = state.get("ruling") or {}
    turns = state.get("turns") or []
    consultations = state.get("consultations") or []

    section_numbers = [s.get("section") for s in sections if s.get("section")]
    codes = sorted({(s.get("code") or "IPC").upper() for s in sections}) or ["IPC"]

    # A TurnRecord wraps the argument in `content`; the headline and body are
    # one level down, not on the record itself.
    transcript = "\n".join(
        part for turn in turns
        for part in ((turn.get("content") or {}).get("headline") or "",
                     (turn.get("content") or {}).get("argument") or "")
        if part
    )
    questions = "\n".join(
        part for c in consultations
        for part in (c.get("question") or "", c.get("answer") or "")
        if part
    )

    created_at = state.get("created_at") or ""

    return {
        "id": state["debate_id"],
        "user_id": state.get("user_id", ""),
        "title": _title(case, section_numbers),
        "summary": (case.get("summary") or state.get("description") or "")[:2000],
        "crime_type": case.get("crime_type") or "",
        "sections": section_numbers,
        "codes": codes,
        "stage": state.get("stage", ""),
        "outcome": ruling.get("favoured_side") or "",
        "disposition": ruling.get("disposition") or "",
        "ruling": (ruling.get("reasoning") or ruling.get("disposition") or "")[:4000],
        "transcript": (transcript + "\n" + questions)[:20000],
        "turns": len(turns),
        "created_at": created_at,
        # Meilisearch sorts on numbers, not ISO strings.
        "created_at_ts": _timestamp(created_at),
        "year": _year(created_at),
    }


def _title(case: Dict[str, Any], sections: List[str]) -> str:
    crime = (case.get("crime_type") or "").strip()
    section = sections[0] if sections else ""
    if crime and section:
        return f"{crime.title()} — s.{section}"
    if crime:
        return crime.title()
    summary = (case.get("summary") or "").strip()
    return (summary[:60] + "…") if len(summary) > 60 else (summary or "Untitled matter")


def _timestamp(iso: str) -> int:
    from datetime import datetime

    try:
        return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp())
    except Exception:
        return 0


def _year(iso: str) -> int:
    return int(iso[:4]) if iso[:4].isdigit() else 0


# ── Meilisearch ──────────────────────────────────────────────────────────

class MeiliBackend:
    name = "meilisearch"

    def __init__(self, url: str, key: str) -> None:
        self._base = url.rstrip("/")
        self._key = key
        self._client: Optional[httpx.AsyncClient] = None
        self._ready = False
        self._lock = asyncio.Lock()

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            headers = {"Authorization": f"Bearer {self._key}"} if self._key else {}
            self._client = httpx.AsyncClient(base_url=self._base, timeout=10.0,
                                             headers=headers)
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def ensure_index(self) -> None:
        """Create the index and push its settings. Idempotent, runs once."""
        if self._ready:
            return
        async with self._lock:
            if self._ready:
                return
            client = self._http()
            try:
                await client.post("/indexes",
                                  json={"uid": INDEX, "primaryKey": "id"})
            except Exception as exc:
                log.debug("search.index_create", extra={"error": str(exc)[:120]})
            try:
                response = await client.patch(
                    f"/indexes/{INDEX}/settings",
                    json={"filterableAttributes": _FILTERABLE,
                          "sortableAttributes": _SORTABLE,
                          "searchableAttributes": _SEARCHABLE},
                )
                response.raise_for_status()
                self._ready = True
                log.info("search.index_ready", extra={"index": INDEX})
            except Exception as exc:
                log.warning("search.index_settings_failed",
                            extra={"error": str(exc)[:160]})

    async def index(self, document: Dict[str, Any]) -> bool:
        await self.ensure_index()
        try:
            response = await self._http().put(f"/indexes/{INDEX}/documents",
                                              json=[document])
            response.raise_for_status()
            return True
        except Exception as exc:
            log.warning("search.index_failed",
                        extra={"id": document.get("id"), "error": str(exc)[:160]})
            return False

    async def remove(self, debate_id: str) -> bool:
        try:
            response = await self._http().delete(
                f"/indexes/{INDEX}/documents/{debate_id}")
            response.raise_for_status()
            return True
        except Exception as exc:
            log.warning("search.delete_failed",
                        extra={"id": debate_id, "error": str(exc)[:160]})
            return False

    async def search(self, user_id: str, query: str, *, limit: int = 20,
                     section: str = "", outcome: str = "") -> List[Dict[str, Any]]:
        await self.ensure_index()
        # Server-side tenancy. Never interpolate anything but the ids we own.
        filters = [f'user_id = "{_escape(user_id)}"']
        if section:
            filters.append(f'sections = "{_escape(section)}"')
        if outcome:
            filters.append(f'outcome = "{_escape(outcome)}"')

        try:
            response = await self._http().post(
                f"/indexes/{INDEX}/search",
                json={"q": query, "filter": " AND ".join(filters),
                      "limit": limit,
                      "attributesToHighlight": ["summary", "transcript"],
                      "attributesToCrop": ["transcript"],
                      "cropLength": 40},
            )
            response.raise_for_status()
            hits = response.json().get("hits", [])
        except Exception as exc:
            log.warning("search.query_failed", extra={"error": str(exc)[:160]})
            return []
        return [_to_result(hit) for hit in hits]


def _escape(value: str) -> str:
    return value.replace("\\", "").replace('"', "")


def _to_result(hit: Dict[str, Any]) -> Dict[str, Any]:
    formatted = hit.get("_formatted") or {}
    return {
        "id": hit.get("id"),
        "title": hit.get("title", ""),
        "summary": hit.get("summary", "")[:200],
        "snippet": (formatted.get("transcript") or "")[:300],
        "sections": hit.get("sections", []),
        "outcome": hit.get("outcome", ""),
        "stage": hit.get("stage", ""),
        "turns": hit.get("turns", 0),
        "created_at": hit.get("created_at", ""),
    }


# ── MongoDB fallback ─────────────────────────────────────────────────────

class MongoBackend:
    """Text search over the fields the debates text index was built on.

    Deliberately limited, and it says so: `search.py`'s Mongo index covers
    the case description and offence type, not the transcript. Finding a
    hearing by something counsel argued needs Meilisearch.
    """

    name = "mongo"

    async def ensure_index(self) -> None:
        return None

    async def index(self, document: Dict[str, Any]) -> bool:
        return True  # Mongo already holds the record; nothing to copy

    async def remove(self, debate_id: str) -> bool:
        return True  # deleting the debate deletes the searchable copy

    async def search(self, user_id: str, query: str, *, limit: int = 20,
                     section: str = "", outcome: str = "") -> List[Dict[str, Any]]:
        from app.db.mongodb import db

        criteria: Dict[str, Any] = {"user_id": user_id}
        if query.strip():
            criteria["$text"] = {"$search": query}
        if section:
            criteria["sections.section"] = section
        if outcome:
            criteria["ruling.favoured_side"] = outcome

        try:
            cursor = db.debates.find(criteria).limit(limit)
            out = []
            async for doc in cursor:
                document = build_document(doc)
                out.append(_to_result({**document, "_formatted": {}}))
            return out
        except Exception as exc:
            log.warning("search.mongo_failed", extra={"error": str(exc)[:160]})
            return []


# ── selection ────────────────────────────────────────────────────────────

_backend = None


def get_backend():
    global _backend
    if _backend is None:
        if settings.MEILI_URL.strip():
            _backend = MeiliBackend(settings.MEILI_URL, settings.MEILI_MASTER_KEY)
        else:
            _backend = MongoBackend()
        log.info("search.backend", extra={"backend": _backend.name})
    return _backend


def set_backend(backend) -> None:
    """Test seam."""
    global _backend
    _backend = backend


def backend_name() -> str:
    return get_backend().name


async def close_backend() -> None:
    if isinstance(_backend, MeiliBackend):
        await _backend.aclose()


# ── public surface ───────────────────────────────────────────────────────

async def index_debate(state: Dict[str, Any]) -> bool:
    """Index a hearing once it has stopped moving. Never raises."""
    if state.get("stage") not in TERMINAL_STAGES:
        return False
    try:
        return await get_backend().index(build_document(state))
    except Exception as exc:
        log.warning("search.index_error", extra={"error": str(exc)[:160]})
        return False


async def remove_debate(debate_id: str) -> bool:
    try:
        return await get_backend().remove(debate_id)
    except Exception as exc:
        log.warning("search.remove_error", extra={"error": str(exc)[:160]})
        return False


async def search(user_id: str, query: str, *, limit: int = 20,
                 section: str = "", outcome: str = "") -> Dict[str, Any]:
    results = await get_backend().search(user_id, query, limit=limit,
                                         section=section, outcome=outcome)
    return {"backend": backend_name(), "query": query, "results": results,
            "count": len(results)}


async def reindex_all() -> int:
    """Rebuild the index from Mongo. For a first run, or after a wipe."""
    from app.db.mongodb import db

    backend = get_backend()
    await backend.ensure_index()
    written = 0
    async for doc in db.debates.find({"stage": {"$in": sorted(TERMINAL_STAGES)}}):
        doc.pop("_id", None)
        if await backend.index(build_document(doc)):
            written += 1
    log.info("search.reindexed", extra={"count": written, "backend": backend.name})
    return written
