"""Precedent and statute retrieval.

The previous implementation embedded `processed_prompt["crime_type"]` — a
single word such as "murder" — took the top 1 hit, hard-filtered
`metadata.court` against a fixed four-value list and dropped anything under
0.70 cosine. A one-word query cannot discriminate between two murder cases
with opposite facts, and the hard court filter silently excluded everything
whose court string did not match one of four exact spellings.

Now:
  * the query is the full case description plus the sections in play;
  * `k=8` candidates are fetched and reranked down to 3;
  * court seniority is a *boost*, not a filter;
  * exact section lookup uses a payload filter instead of paying for an
    embedding to fetch by primary key.

The reranker is deterministic and feature-based rather than a cross-encoder:
no model weights can be downloaded in this environment, and a transparent
scoring function is easier to test and explain. `bge-reranker-v2-m3` is the
intended upgrade and slots in behind `rerank()` without touching callers.
"""

from __future__ import annotations

import asyncio
import re
from typing import Dict, List, Optional, Sequence

from qdrant_client.http import models as qm

from app.core.config import settings
from app.core.errors import RetrievalError
from app.core.llm import llm
from app.core.logging import Timer, get_logger
from app.core.qdrant_client import CASE_LAWS, STATUTES, ensure_collection, get_client
from app.domain.schemas import Precedent, SectionReference

log = get_logger(__name__)

# Court seniority, used as a ranking boost. Matched case-insensitively on a
# substring so "Hon'ble Supreme Court of India" still scores as apex.
COURT_RANKS = [
    (("supreme court",), 3),
    (("high court",), 2),
    (("sessions", "district", "magistrate"), 1),
]


def court_rank(court: str) -> int:
    lowered = (court or "").lower()
    for needles, rank in COURT_RANKS:
        if any(n in lowered for n in needles):
            return rank
    return 0


def normalise_section(section: str) -> str:
    """'Section 302 - Murder' -> '302'; '302A' -> '302A'."""
    match = re.search(r"(\d+\s*[A-Za-z]?)", section or "")
    return match.group(1).replace(" ", "").upper() if match else (section or "").strip()


def _payload_to_precedent(payload: Dict, score: float) -> Precedent:
    return Precedent(
        citation_id=payload.get("citation_id", ""),
        case_name=payload.get("case_name", "Unknown case"),
        court=payload.get("court", ""),
        date=payload.get("date", ""),
        sections=list(payload.get("sections", []) or []),
        holding=payload.get("holding", "") or "",
        summary=payload.get("summary", "") or "",
        source_url=payload.get("source_url", "") or "",
        score=round(float(score), 4),
        # Only the curated ingest sets this. Anything else is treated as
        # unverified and is never presented as citable precedent.
        verified=bool(payload.get("verified", False)),
    )


def build_query(summary: str, sections: Sequence[str] = (), crime_type: str = "") -> str:
    """Compose the retrieval query.

    Sections and crime type are appended to the *facts* rather than replacing
    them: the facts are what discriminate between judgments under the same
    section, which is exactly what the old one-word query threw away.
    """
    parts = [(summary or "").strip()]
    if crime_type:
        parts.append(f"Offence type: {crime_type}")
    if sections:
        parts.append("Sections in issue: " + ", ".join(normalise_section(s) for s in sections))
    return "\n".join(p for p in parts if p)


def rerank(
    candidates: List[Precedent], *, sections: Sequence[str] = (), top_n: int = 3
) -> List[Precedent]:
    """Re-order candidates by a blend of similarity and legal relevance.

    Weights are deliberately simple and inspectable:
      0.70  vector similarity        — what the query actually matched
      0.18  section overlap          — same provision as the case in hand
      0.09  court seniority          — apex/High Court precedent binds harder
      0.03  recency                  — later authority preferred, all else equal
    """
    wanted = {normalise_section(s) for s in sections if s}

    def score(p: Precedent) -> float:
        overlap = 0.0
        if wanted:
            have = {normalise_section(s) for s in p.sections}
            if have:
                overlap = len(wanted & have) / len(wanted)
        seniority = court_rank(p.court) / 3.0
        year = 0.0
        match = re.match(r"(\d{4})", p.date or "")
        if match:
            # Map 1950..2030 onto 0..1; older judgments are not penalised
            # much, they are just tie-broken below newer ones.
            year = min(1.0, max(0.0, (int(match.group(1)) - 1950) / 80.0))
        return 0.70 * p.score + 0.18 * overlap + 0.09 * seniority + 0.03 * year

    def on_point(p: Precedent) -> bool:
        """Keep only what is plausibly usable.

        A semantic near-miss is worse than nothing: it costs context tokens on
        every turn and invites counsel to reach for an authority that does not
        support the proposition. So a candidate must either share a section
        with the case in hand, or clear a distinctly higher similarity bar on
        the facts alone.
        """
        if wanted and {normalise_section(s) for s in p.sections} & wanted:
            return True
        return p.score >= settings.RETRIEVAL_MIN_SCORE + 0.15

    ranked = sorted((p for p in candidates if on_point(p)), key=score, reverse=True)
    return ranked[:top_n]


async def find_precedents(
    summary: str,
    *,
    sections: Sequence[str] = (),
    crime_type: str = "",
    top_n: Optional[int] = None,
    verified_only: bool = True,
) -> List[Precedent]:
    """Retrieve precedent for a case. Returns [] when the corpus has nothing.

    Returning an empty list is a first-class outcome: the debate then argues
    from statute alone and says so, rather than inventing a judgment.
    """
    query = build_query(summary, sections, crime_type)
    if not query.strip():
        return []

    try:
        await ensure_collection(CASE_LAWS)
        vector = (await llm.embed([query], query=True))[0]

        conditions = []
        if verified_only:
            # Belt and braces: the app cannot write here, and it will not read
            # anything that was not marked verified at ingest either.
            conditions.append(
                qm.FieldCondition(key="verified", match=qm.MatchValue(value=True))
            )

        with Timer() as timer:
            response = await get_client().query_points(
                collection_name=CASE_LAWS,
                query=vector,
                limit=settings.RETRIEVAL_CANDIDATES,
                score_threshold=settings.RETRIEVAL_MIN_SCORE,
                query_filter=qm.Filter(must=conditions) if conditions else None,
                with_payload=True,
            )
        candidates = [
            _payload_to_precedent(point.payload or {}, point.score)
            for point in response.points
        ]
        ranked = rerank(candidates, sections=sections,
                        top_n=top_n or settings.RETRIEVAL_TOP_N)
        log.info(
            "retrieval.precedents",
            extra={"candidates": len(candidates), "returned": len(ranked),
                   "ms": timer.ms,
                   "top_score": round(ranked[0].score, 3) if ranked else None},
        )
        return ranked
    except Exception as exc:
        # Retrieval failing must not take the debate down; it degrades to
        # statute-only argument, which the UI labels.
        log.error("retrieval.failed", extra={"error": str(exc)[:200]})
        return []


async def get_statute(section: str, code: str = "IPC") -> Optional[SectionReference]:
    """Fetch statute text by exact section — a keyed lookup, not a search.

    The old `search_by_ipc_section` embedded the string "IPC Section 302" and
    ran a vector query with an exact metadata filter attached, paying for an
    embedding to do a primary-key fetch.
    """
    normalised = normalise_section(section)
    try:
        await ensure_collection(STATUTES)
        points, _ = await get_client().scroll(
            collection_name=STATUTES,
            scroll_filter=qm.Filter(
                must=[
                    qm.FieldCondition(key="section", match=qm.MatchValue(value=normalised)),
                    qm.FieldCondition(key="code", match=qm.MatchValue(value=code.upper())),
                ]
            ),
            limit=1,
            with_payload=True,
            with_vectors=False,
        )
        if not points:
            return None
        payload = points[0].payload or {}
        return SectionReference.model_validate(payload.get("reference", payload))
    except Exception as exc:
        log.warning("retrieval.statute_failed",
                    extra={"section": normalised, "error": str(exc)[:160]})
        return None


async def gather_context(
    summary: str, sections: Sequence[str], crime_type: str, code: str = "IPC"
) -> Dict[str, object]:
    """Fan out the independent research steps concurrently.

    Steps 04–06 of the old pipeline (precedent, section detail, evidence
    classes) were mutually independent and ran one after another anyway.
    """
    primary = normalise_section(sections[0]) if sections else ""
    precedent_task = find_precedents(summary, sections=sections, crime_type=crime_type)
    statute_task = get_statute(primary, code) if primary else _none()
    precedents, statute = await asyncio.gather(precedent_task, statute_task)
    return {"precedents": precedents, "statute": statute}


async def _none() -> None:
    return None
