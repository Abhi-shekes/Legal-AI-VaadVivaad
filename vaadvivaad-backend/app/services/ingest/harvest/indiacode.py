"""India Code — the government's bare-acts repository.

India Code migrated from `indiacode.nic.in` to `indiacode.gov.in` and is now
a DSpace 9 instance with a public REST API. That matters a great deal here:
the other official portals (the eCourts judgment search, the Supreme Court's
own judgment search) put a CAPTCHA in front of every query, and working
around one is not something this project will do. India Code asks for
nothing, publishes structured metadata, and is the authoritative source for
the text it serves.

Every section is its own DSpace item, and the section text lives in the
metadata rather than in an attached PDF — so no PDF parsing is needed for
statutes, and what gets indexed is the publisher's own text rather than
something reconstructed from a page layout.

**What this does not do.** `SectionReference` has fields for the elements of
the offence, the mental element, the standard of proof and the available
defences. India Code does not publish those, and they are not derivable from
the bare text without interpretation. They are left empty rather than filled
in by a model: this codebase already learned once, expensively, what happens
when generated content is written into a corpus and then retrieved as ground
truth. `definition` carries the section verbatim, and verbatim is the whole
value of a statute lookup.
"""

from __future__ import annotations

import html
import re
from dataclasses import dataclass
from typing import AsyncIterator, Dict, List, Optional

from app.core.config import settings
from app.core.logging import get_logger
from app.services.ingest.harvest.fetcher import PoliteFetcher

log = get_logger(__name__)

SOURCE = "indiacode"  # must be in pipeline.TRUSTED_SOURCES to be citable

# Act name -> the short code the rest of the system uses.
#
# Only the three codes currently in force are here, and that is not an
# oversight. India Code withdrew the Indian Penal Code, the Code of Criminal
# Procedure and the Indian Evidence Act from its central collection when the
# 2023 codes replaced them on 1 July 2024; searching for them returns only
# state-adapted versions (Chhattisgarh, Rajasthan), whose text differs from
# the central act. Indexing a state adaptation and labelling it "IPC" would
# put wrong statute text in front of counsel, so this refuses to do it.
#
# For an incident before 1 July 2024 the IPC still governs, and the answer
# there is `services/concordance.py`, which maps the IPC section to its BNS
# counterpart from hand-checked data and shows both. That is a real gap in
# coverage, not a solved problem -- bare IPC text needs a different source.
CODES: Dict[str, str] = {
    "bharatiya nyaya sanhita": "BNS",
    "bharatiya nagarik suraksha sanhita": "BNSS",
    "bharatiya sakshya adhiniyam": "BSA",
}

# Asked for one of these, say why rather than returning nothing.
WITHDRAWN = {
    "IPC": "the Indian Penal Code",
    "CRPC": "the Code of Criminal Procedure",
    "IEA": "the Indian Evidence Act",
}

# DSpace caps page size; 100 is the usual ceiling and is plenty.
_PAGE_SIZE = 100


@dataclass
class Act:
    uuid: str
    act_id: str
    name: str
    code: str
    year: str


def _meta(item: dict, key: str, default: str = "") -> str:
    values = (item.get("metadata") or {}).get(key) or []
    return (values[0].get("value") if values else default) or default


def code_for(act_name: str) -> Optional[str]:
    lowered = (act_name or "").lower()
    for needle, code in CODES.items():
        if needle in lowered:
            return code
    return None


_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"[ \t ]+")


def to_plain_text(markup: str) -> str:
    """The section text is served as HTML fragments. Flatten it.

    `<br>` and `<hr>` are the only structural markers India Code uses inside a
    section note, so they become newlines and everything else is dropped.
    """
    if not markup:
        return ""
    text = re.sub(r"<\s*(br|hr)\s*/?\s*>", "\n", markup, flags=re.I)
    text = _TAG.sub("", text)
    text = html.unescape(text)
    text = _WS.sub(" ", text)
    return "\n".join(line.strip() for line in text.splitlines() if line.strip())


class IndiaCode:
    """Read-only client for the parts of the DSpace API this needs."""

    def __init__(self, fetcher: PoliteFetcher,
                 base_url: Optional[str] = None) -> None:
        self._fetcher = fetcher
        self._base = (base_url or settings.INDIACODE_BASE_URL).rstrip("/")

    @property
    def _api(self) -> str:
        return f"{self._base}/server/api"

    async def _search(self, query: str, page: int = 0,
                      size: int = _PAGE_SIZE) -> Optional[dict]:
        # Statute text does not change between two runs of a harvest, so a
        # cached page is served without troubling the server at all.
        response = await self._fetcher.fetch(
            f"{self._api}/discover/search/objects",
            params={"query": query, "dsoType": "item",
                    "page": str(page), "size": str(size)},
            revalidate=False,
        )
        if response is None:
            return None
        try:
            return response.json()
        except Exception as exc:
            log.warning("indiacode.bad_json", extra={"error": str(exc)[:120]})
            return None

    @staticmethod
    def _objects(payload: Optional[dict]) -> List[dict]:
        if not payload:
            return []
        result = (payload.get("_embedded") or {}).get("searchResult") or {}
        embedded = (result.get("_embedded") or {}).get("objects") or []
        return [(o.get("_embedded") or {}).get("indexableObject") or {}
                for o in embedded]

    @staticmethod
    def _total_pages(payload: Optional[dict]) -> int:
        if not payload:
            return 0
        result = (payload.get("_embedded") or {}).get("searchResult") or {}
        return int((result.get("page") or {}).get("totalPages") or 0)

    async def find_act(self, name: str) -> Optional[Act]:
        """Locate the *central* act by name. Returns None when absent.

        The state filter is load-bearing. India Code carries state-adapted
        versions of several acts under identical titles, and a query without
        it happily returns Chhattisgarh's Indian Penal Code — same name,
        different text, wrong law for a central prosecution.
        """
        query = (f'dc.identifier.collection:ACT '
                 f'AND dc.identifier.state_name:CENTRAL '
                 f'AND dc.title:"{name}"')
        payload = await self._search(query, size=25)
        wanted = name.lower()
        candidates = [
            item for item in self._objects(payload)
            if _meta(item, "dc.identifier.collection").upper() == "ACT"
            and _meta(item, "dc.identifier.state_name").upper() == "CENTRAL"
            and wanted in _meta(item, "dc.title").lower()
        ]
        if not candidates:
            return None

        # Shortest matching title: "The Bharatiya Nyaya Sanhita, 2023" over
        # "... (Amendment) Act".
        item = sorted(candidates, key=lambda i: len(_meta(i, "dc.title")))[0]
        act_name = _meta(item, "dc.title")
        return Act(
            uuid=item.get("uuid", ""),
            act_id=_meta(item, "dc.identifier.act_id"),
            name=act_name,
            code=code_for(act_name) or "",
            year=_meta(item, "dc.date.act_year"),
        )

    async def iter_sections(self, act: Act) -> AsyncIterator[dict]:
        """Yield every SECTION item belonging to an act, page by page."""
        if not act.act_id:
            return
        query = f"dc.identifier.act_id:{act.act_id}"
        page = 0
        total_pages = 1
        while page < total_pages:
            payload = await self._search(query, page=page)
            if payload is None:
                log.warning("indiacode.page_failed",
                            extra={"act": act.name, "page": page})
                return
            total_pages = self._total_pages(payload) or 1
            for item in self._objects(payload):
                if _meta(item, "dc.identifier.collection").upper() == "SECTION":
                    yield item
            page += 1


def to_record(item: dict, act: Act) -> Optional[dict]:
    """One DSpace item -> one record for `ingest_statutes`.

    Returns None for anything without a section number or without text; a
    statute entry with no text is worse than no entry, because `get_statute`
    would then return an empty reference instead of falling through to the
    concordance note.
    """
    section = _meta(item, "dc.identifier.section_number") or \
        _meta(item, "dc.identifier.page_number")
    definition = to_plain_text(_meta(item, "dc.identifier.section_page_note"))
    if not section or not definition:
        return None

    repealed = _meta(item, "dc.identifier.repealed").lower() == "true"

    return {
        "section": section,
        "code": act.code or code_for(_meta(item, "dc.title.act_name")) or "IPC",
        "source": SOURCE,
        "repealed": repealed,
        "reference": {
            "section": section,
            "code": act.code,
            # Verbatim publisher text. The analytical fields of
            # SectionReference stay empty on purpose -- see the module
            # docstring.
            "definition": definition,
        },
        "act_name": act.name,
        "act_year": act.year,
        "title": _meta(item, "dc.title"),
        "source_url": f"{settings.INDIACODE_BASE_URL}/handle/{item.get('handle', '')}"
                      if item.get("handle") else settings.INDIACODE_BASE_URL,
    }


async def harvest(codes: List[str]) -> AsyncIterator[dict]:
    """Yield statute records for the named codes (IPC, BNS, ...)."""
    wanted = {c.upper() for c in codes}
    for code in sorted(wanted & set(WITHDRAWN)):
        log.warning(
            "indiacode.code_withdrawn",
            extra={"code": code,
                   "reason": f"India Code no longer publishes {WITHDRAWN[code]} "
                             f"centrally; it was repealed on 2024-07-01. Only "
                             f"state adaptations remain, and their text differs.",
                   "instead": "services/concordance.py maps the section to its "
                              "2023-code counterpart"},
        )
    names = [name for name, code in CODES.items() if code in wanted]
    if not names:
        log.error("indiacode.nothing_to_harvest",
                  extra={"asked": sorted(wanted), "available": sorted(set(CODES.values()))})
        return

    async with PoliteFetcher() as fetcher:
        client = IndiaCode(fetcher)
        for name in names:
            act = await client.find_act(name)
            if act is None:
                log.warning("indiacode.act_not_found", extra={"act": name})
                continue
            log.info("indiacode.act",
                     extra={"act": act.name, "code": act.code, "year": act.year})

            count = 0
            skipped = 0
            async for item in client.iter_sections(act):
                record = to_record(item, act)
                if record is None:
                    skipped += 1
                    continue
                count += 1
                yield record
            log.info("indiacode.act_done",
                     extra={"act": act.name, "sections": count,
                            "skipped": skipped, **fetcher.stats})
