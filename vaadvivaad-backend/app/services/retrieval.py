"""Precedent and statute retrieval.

The original implementation embedded `processed_prompt["crime_type"]` — a
single word such as "murder" — took the top 1 hit, hard-filtered
`metadata.court` against a fixed four-value list and dropped anything under
0.70 cosine. A one-word query cannot discriminate between two murder cases
with opposite facts, and the hard court filter silently excluded everything
whose court string did not match one of four exact spellings.

That was fixed by querying on the full facts, fetching k=8 and reranking to
3, turning court seniority into a boost, and looking sections up by payload
filter instead of paying for an embedding to fetch by primary key.

This pass adds the two things that fix were still missing:

  * **Hybrid retrieval.** Dense vectors blur the exact tokens legal text
    turns on — `302`, `BNS 103`, a party's name. A BM25 sparse vector runs
    beside the dense one and the two result lists are fused by reciprocal
    rank. `normalise_section()` below exists because those literal strings
    matter; until now nothing searched on them.

  * **A real reranker.** This module used to note that `bge-reranker-v2-m3`
    was the intended upgrade and that no model weights could be downloaded
    here. A local Text Embeddings Inference container removes that
    constraint. It is *blended* with the deterministic legal features rather
    than replacing them, because a cross-encoder has no idea that apex
    authority on the same provision binds harder.

Fusion is done here rather than by Qdrant's server-side `FusionQuery`. One
extra round trip to a local Qdrant costs microseconds, and in exchange the
dense cosine score stays visible — which is what `on_point()` needs, since
an RRF score is a rank artefact and cannot be compared against a similarity
floor. It also means the whole ranking path is testable without a running
Qdrant.

Every addition degrades to the previous behaviour: no `fastembed` means
dense-only, no rerank URL means the feature ranking, no Qdrant means an
empty list and a hearing argued from statute alone.
"""

from __future__ import annotations

import asyncio
import re
from dataclasses import dataclass
from typing import Dict, List, Optional, Sequence, Tuple

from qdrant_client.http import models as qm

from app.core.config import settings
from app.core.embeddings import (
    DENSE,
    SPARSE,
    get_embedder,
    get_reranker,
    get_sparse_encoder,
)
from app.core.logging import Timer, get_logger
from app.core.qdrant_client import CASE_LAWS, STATUTES, ensure_collection, get_client
from app.domain.schemas import Precedent, SectionReference
from app.services import authority

log = get_logger(__name__)

# Court seniority, used as a ranking boost. Matched case-insensitively on a
# substring so "Hon'ble Supreme Court of India" still scores as apex.
COURT_RANKS = [
    (("supreme court",), 3),
    (("high court",), 2),
    (("sessions", "district", "magistrate"), 1),
]

# Reciprocal-rank fusion constant. 60 is the value from the original TREC
# work and the one Qdrant's own server-side fusion uses; it damps the
# difference between rank 1 and rank 2 enough that a single list cannot
# dominate the other.
RRF_K = 60


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


# ── candidates ───────────────────────────────────────────────────────────

@dataclass
class Candidate:
    """One retrieved judgment plus where each retriever put it.

    `dense_rank is None` means the sparse side found it and the dense side
    did not — so it never cleared the cosine floor, and `precedent.score` is
    0.0 rather than a similarity that was never measured.
    """

    precedent: Precedent
    dense_rank: Optional[int] = None
    sparse_rank: Optional[int] = None
    relevance: Optional[float] = None

    @property
    def rrf(self) -> float:
        return sum(1.0 / (RRF_K + rank)
                   for rank in (self.dense_rank, self.sparse_rank)
                   if rank is not None)

    @property
    def fused(self) -> float:
        """RRF mapped onto 0..1, where 1 is rank 1 in both lists."""
        return min(1.0, self.rrf / (2.0 / (RRF_K + 1)))

    def rerank_text(self) -> str:
        p = self.precedent
        body = p.holding or p.summary
        head = f"{p.case_name} ({p.court}, {p.date})".strip()
        sections = f" Sections: {', '.join(p.sections)}." if p.sections else ""
        return f"{head}.{sections} {body}".strip()


def _verified_filter(verified_only: bool) -> Optional[qm.Filter]:
    if not verified_only:
        return None
    # Belt and braces: the app cannot write to the corpus, and it will not
    # read anything that was not marked verified at ingest either.
    return qm.Filter(
        must=[qm.FieldCondition(key="verified", match=qm.MatchValue(value=True))]
    )


async def _dense_search(vector: List[float], query_filter: Optional[qm.Filter],
                        limit: int) -> List[Tuple[Dict, float]]:
    response = await get_client().query_points(
        collection_name=CASE_LAWS,
        query=vector,
        using=DENSE,
        limit=limit,
        score_threshold=settings.RETRIEVAL_MIN_SCORE,
        query_filter=query_filter,
        with_payload=True,
    )
    return [(point.payload or {}, point.score) for point in response.points]


async def _sparse_search(sparse: Tuple[List[int], List[float]],
                         query_filter: Optional[qm.Filter],
                         limit: int) -> List[Tuple[Dict, float]]:
    """BM25 side. No score floor: BM25 scores are unbounded and corpus-
    relative, so a threshold on them would mean something different for
    every query. The floor for sparse-only hits is applied in `on_point()`.
    """
    indices, values = sparse
    if not indices:
        return []
    response = await get_client().query_points(
        collection_name=CASE_LAWS,
        query=qm.SparseVector(indices=indices, values=values),
        using=SPARSE,
        limit=limit,
        query_filter=query_filter,
        with_payload=True,
    )
    return [(point.payload or {}, point.score) for point in response.points]


def fuse(dense: List[Tuple[Dict, float]],
         sparse: List[Tuple[Dict, float]]) -> List[Candidate]:
    """Reciprocal-rank fusion, keyed on citation_id."""
    by_id: Dict[str, Candidate] = {}

    for rank, (payload, score) in enumerate(dense, start=1):
        citation_id = payload.get("citation_id", "")
        if not citation_id:
            continue
        by_id[citation_id] = Candidate(
            precedent=_payload_to_precedent(payload, score), dense_rank=rank
        )

    for rank, (payload, _score) in enumerate(sparse, start=1):
        citation_id = payload.get("citation_id", "")
        if not citation_id:
            continue
        existing = by_id.get(citation_id)
        if existing is not None:
            existing.sparse_rank = rank
        else:
            by_id[citation_id] = Candidate(
                precedent=_payload_to_precedent(payload, 0.0), sparse_rank=rank
            )

    return list(by_id.values())


# ── ranking ──────────────────────────────────────────────────────────────

def _legal_score(precedent: Precedent, wanted: set) -> float:
    """The domain half of the ranking. Sums to 1.0.

        0.60  section overlap    — same provision as the case in hand
        0.30  court seniority    — apex/High Court precedent binds harder
        0.10  recency            — later authority preferred, all else equal
    """
    overlap = 0.0
    if wanted:
        have = {normalise_section(s) for s in precedent.sections}
        if have:
            overlap = len(wanted & have) / len(wanted)

    seniority = court_rank(precedent.court) / 3.0

    year = 0.0
    match = re.match(r"(\d{4})", precedent.date or "")
    if match:
        # Map 1950..2030 onto 0..1; older judgments are not penalised much,
        # they are just tie-broken below newer ones.
        year = min(1.0, max(0.0, (int(match.group(1)) - 1950) / 80.0))

    return 0.60 * overlap + 0.30 * seniority + 0.10 * year


def rerank(candidates: Sequence, *, sections: Sequence[str] = (),
           top_n: int = 3) -> List[Precedent]:
    """Re-order candidates by a blend of similarity and legal relevance.

    Accepts either `Candidate`s or bare `Precedent`s; the latter is the
    dense-only shape and the one the tests exercise directly.

    The similarity term is whichever signal is the most informative one
    available, and the weight follows it:

        cross-encoder relevance   weight RERANK_WEIGHT (0.60)
        fused RRF position        weight 0.70
        dense cosine              weight 0.70

    At 0.70 against the legal weights this is arithmetically identical to the
    original 0.70/0.18/0.09/0.03 formula, so adding hybrid retrieval and a
    reranker did not quietly re-tune the dense-only path underneath it.
    """
    wrapped: List[Candidate] = [
        c if isinstance(c, Candidate) else Candidate(precedent=c, dense_rank=1)
        for c in candidates
    ]
    wanted = {normalise_section(s) for s in sections if s}
    reranked = any(c.relevance is not None for c in wrapped)
    weight = settings.RERANK_WEIGHT if reranked else 0.70

    def similarity(c: Candidate) -> float:
        if c.relevance is not None:
            return c.relevance
        if c.sparse_rank is not None:
            return c.fused
        return c.precedent.score

    def score(c: Candidate) -> float:
        return weight * similarity(c) + (1 - weight) * _legal_score(c.precedent, wanted)

    def on_point(c: Candidate) -> bool:
        """Keep only what is plausibly usable.

        A semantic near-miss is worse than nothing: it costs context tokens on
        every turn and invites counsel to reach for an authority that does not
        support the proposition. So a candidate must either share a section
        with the case in hand, or clear a distinctly higher bar on its own.

        For a sparse-only hit that higher bar cannot be a cosine floor — it
        was never scored by the dense retriever. The cross-encoder answers it
        when one is configured; without one, literal term overlap alone is not
        enough to put an authority in front of counsel, so it is dropped.
        """
        if wanted and {normalise_section(s) for s in c.precedent.sections} & wanted:
            return True
        if c.relevance is not None:
            return c.relevance >= settings.RERANK_MIN_RELEVANCE
        if c.dense_rank is None:
            return False
        return c.precedent.score >= settings.RETRIEVAL_MIN_SCORE + 0.15

    ranked = sorted((c for c in wrapped if on_point(c)), key=score, reverse=True)
    return [c.precedent for c in ranked[:top_n]]


# ── entry points ─────────────────────────────────────────────────────────

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
        limit = settings.RETRIEVAL_CANDIDATES
        query_filter = _verified_filter(verified_only)

        sparse_encoder = get_sparse_encoder()
        want_sparse = settings.HYBRID_SEARCH and await sparse_encoder.available()

        with Timer() as timer:
            vector_task = get_embedder().embed([query], query=True)
            if want_sparse:
                dense_vectors, sparse_vectors = await asyncio.gather(
                    vector_task, sparse_encoder.encode([query], query=True)
                )
            else:
                dense_vectors, sparse_vectors = await vector_task, []

            searches = [_dense_search(dense_vectors[0], query_filter, limit)]
            if sparse_vectors:
                searches.append(_sparse_search(sparse_vectors[0], query_filter, limit))
            results = await asyncio.gather(*searches)

        candidates = fuse(results[0], results[1] if len(results) > 1 else [])
        await _apply_reranker(query, candidates)

        ranked = rerank(candidates, sections=sections,
                        top_n=top_n or settings.RETRIEVAL_TOP_N)
        # Attach how later judgments treated each authority. Done after the
        # cut rather than before: it is three lookups instead of eight, and
        # treatment is a warning to carry, not a reason to rank lower --
        # a distinguished case is still worth arguing about.
        await authority.annotate(ranked)
        log.info(
            "retrieval.precedents",
            extra={"candidates": len(candidates),
                   "dense": len(results[0]),
                   "sparse": len(results[1]) if len(results) > 1 else 0,
                   "reranked": any(c.relevance is not None for c in candidates),
                   "returned": len(ranked),
                   "ms": timer.ms,
                   "top_score": round(ranked[0].score, 3) if ranked else None},
        )
        return ranked
    except Exception as exc:
        # Retrieval failing must not take the debate down; it degrades to
        # statute-only argument, which the UI labels.
        log.error("retrieval.failed", extra={"error": str(exc)[:200]})
        return []


async def _apply_reranker(query: str, candidates: List[Candidate]) -> None:
    """Attach cross-encoder relevance in place. A no-op when unconfigured."""
    if not candidates:
        return
    reranker = get_reranker()
    if not reranker.configured():
        return
    scores = await reranker.score(query, [c.rerank_text() for c in candidates])
    for candidate, relevance in zip(candidates, scores):
        candidate.relevance = relevance


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
