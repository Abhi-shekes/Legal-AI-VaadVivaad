"""The case file: every document in a matter, searchable by the hearing.

`documents.py` reads one upload, extracts a `CaseStructure`, and drops the
bytes. That is enough to open a case and nothing more. A real matter is an
FIR *and* a chargesheet *and* witness statements *and* a medical report *and*
a bail order, and until now nothing downstream could quote a single word of
any of it — counsel argued from a summary of a summary.

This keeps the text, chunked and embedded, so a turn can pull the three
passages from the user's own file that bear on the phase being argued.

**Tenancy.** One Qdrant collection, partitioned by a `debate_id` payload
filter — the single-collection multitenancy shape Qdrant recommends, rather
than a collection per case, which would mean thousands of collections and a
segment per one of them. `user_id` is stored and filtered on as well, so a
guessed debate id is not enough to read someone's file.

**Why passages and not the whole document.** A chargesheet is longer than the
token budget for an entire hearing. Retrieval per phase puts the paragraph
about the recovery in front of counsel during the evidence phase, and the
paragraph about delay in front of them during rebuttal, instead of spending
the budget on both at every turn.

Quotes are page-anchored back to the source document, so a claim resting on
the file can be checked the way `citations.verify_turn()` checks a claim
resting on precedent.
"""

from __future__ import annotations

import asyncio
import hashlib
import re
import uuid
from typing import Any, Dict, List, Optional, Sequence

from qdrant_client.http import models as qm

from app.core.config import settings
from app.core.embeddings import DENSE, SPARSE, get_embedder, get_sparse_encoder
from app.core.logging import Timer, get_logger
from app.core.qdrant_client import CASE_DOCUMENTS, ensure_collection, get_client
from app.services.retrieval import RRF_K

log = get_logger(__name__)

# Long enough to hold a full paragraph of a chargesheet, short enough that
# three of them fit in a turn's context without crowding out the precedent.
CHUNK_CHARS = 700
CHUNK_OVERLAP = 120
MAX_CHUNKS_PER_DOCUMENT = 400

# Short fragments are folded into the passage they introduce. Left standing
# they are actively harmful: cosine similarity is length-normalised, so a bare
# "FIRST INFORMATION REPORT" scores highly against almost any query about an
# FIR and displaces the paragraph that actually answers it.
#
# Two thresholds, because the numbering is a signal. An unnumbered fragment is
# a heading. A *numbered* one is a paragraph the document chose to make --
# "1. District: Pune City." is short and still content -- so it survives
# unless it is barely there at all ("6. Medical: Not applicable.").
MIN_CHUNK_CHARS = 60
MIN_NUMBERED_CHARS = 30

# Indian legal documents are written as numbered paragraphs -- "5. Recovery:
# ...", "(a) ...", or an uppercase heading. Those numbers are the document's
# own retrieval units, and packing several into one chunk is what made
# "Rs. 62,000 recovery" match the FIR's header: the recovery paragraph had
# been merged into a block that opened with the district and station.
SECTION_START = re.compile(
    r"^\s*(?:\d{1,3}[.)]\s|\([a-z0-9]{1,3}\)\s|[IVX]{1,5}[.)]\s|[A-Z][A-Z ]{5,}$)"
)


def chunk(text: str) -> List[str]:
    """Split on paragraph boundaries, packing up to CHUNK_CHARS.

    Paragraph-first rather than a fixed window: legal documents are numbered
    paragraphs, and cutting one in half produces a passage that quotes as
    nonsense. An overlap carries the tail of the previous chunk so a sentence
    spanning a boundary is still findable.
    """
    cleaned = re.sub(r"\n{3,}", "\n\n", (text or "").strip())
    if not cleaned:
        return []

    paragraphs = [p.strip() for p in cleaned.split("\n\n") if p.strip()]
    chunks: List[str] = []
    current = ""

    for paragraph in paragraphs:
        # A new numbered paragraph starts a new chunk, whatever room is left.
        # Granularity matters more than packing efficiency here: three tight
        # passages beat two loose ones when the budget is a turn's context.
        if SECTION_START.match(paragraph) and current:
            chunks.append(current)
            current = ""

        # A single paragraph longer than the budget is split on sentences
        # rather than mid-word.
        if len(paragraph) > CHUNK_CHARS:
            if current:
                chunks.append(current)
                current = ""
            for sentence in re.split(r"(?<=[.;])\s+", paragraph):
                if len(current) + len(sentence) + 1 > CHUNK_CHARS and current:
                    chunks.append(current)
                    current = current[-CHUNK_OVERLAP:] if CHUNK_OVERLAP else ""
                current = f"{current} {sentence}".strip()
            continue

        if len(current) + len(paragraph) + 2 > CHUNK_CHARS and current:
            chunks.append(current)
            current = current[-CHUNK_OVERLAP:] if CHUNK_OVERLAP else ""
        current = f"{current}\n\n{paragraph}".strip()

    if current:
        chunks.append(current)
    return _absorb_stubs(chunks)[:MAX_CHUNKS_PER_DOCUMENT]


def _absorb_stubs(chunks: List[str]) -> List[str]:
    """Fold headings and stubs into the passage that follows them."""
    out: List[str] = []
    pending = ""
    for piece in chunks:
        floor = (MIN_NUMBERED_CHARS if SECTION_START.match(piece)
                 else MIN_CHUNK_CHARS)
        if len(piece) < floor:
            pending = f"{pending}\n\n{piece}".strip() if pending else piece
            continue
        out.append(f"{pending}\n\n{piece}".strip() if pending else piece)
        pending = ""
    if pending:
        # A trailing stub attaches backwards rather than being dropped: it may
        # be the only place a date or a signature appears.
        if out:
            out[-1] = f"{out[-1]}\n\n{pending}"
        else:
            out.append(pending)
    return out


def _point_id(debate_id: str, document_id: str, index: int) -> str:
    """Deterministic, so re-indexing a document replaces rather than duplicates."""
    digest = hashlib.sha256(f"{debate_id}:{document_id}:{index}".encode()).hexdigest()
    return str(uuid.UUID(digest[:32]))


def document_id_for(filename: str, text: str) -> str:
    """Content-addressed: the same file uploaded twice is the same document."""
    return hashlib.sha256(f"{filename}:{text}".encode()).hexdigest()[:16]


async def _sparse_vectors(pieces: Sequence[str], *, query: bool = False):
    """BM25 term weights, or [] when fastembed is unavailable."""
    if not settings.HYBRID_SEARCH:
        return []
    encoder = get_sparse_encoder()
    if not await encoder.available():
        return []
    return await encoder.encode(list(pieces), query=query)


def _named(dense: List[float], sparse) -> Dict[str, Any]:
    vector: Dict[str, Any] = {DENSE: dense}
    if sparse and sparse[0]:
        vector[SPARSE] = qm.SparseVector(indices=sparse[0], values=sparse[1])
    return vector


async def index_document(
    *,
    debate_id: str,
    user_id: str,
    filename: str,
    text: str,
    kind: str = "document",
) -> Dict[str, Any]:
    """Chunk, embed and store one document against a case."""
    pieces = chunk(text)
    if not pieces:
        return {"document_id": "", "filename": filename, "chunks": 0}

    document_id = document_id_for(filename, text)
    await ensure_collection(CASE_DOCUMENTS)

    with Timer() as timer:
        vectors = await get_embedder().embed(pieces)
        # BM25 alongside the dense vector, for the same reason retrieval.py
        # uses it: a case file is full of exact tokens -- "Rs. 62,000",
        # "FIR No. 214/2026", a section number, a witness's name -- and a
        # dense vector blurs precisely those. Without it, "when was the
        # recovery made" matched the FIR's header rather than the recovery
        # paragraph.
        sparse = await _sparse_vectors(pieces)
        points = [
            qm.PointStruct(
                id=_point_id(debate_id, document_id, index),
                vector=_named(vector, sparse[index] if index < len(sparse) else None),
                payload={
                    "debate_id": debate_id,
                    "user_id": user_id,
                    "document_id": document_id,
                    "filename": filename,
                    "kind": kind,
                    "chunk_index": index,
                    "text": piece,
                },
            )
            for index, (piece, vector) in enumerate(zip(pieces, vectors))
        ]
        await get_client().upsert(collection_name=CASE_DOCUMENTS, points=points,
                                  wait=True)

    log.info("casefile.indexed",
             extra={"debate_id": debate_id, "filename": filename,
                    "chunks": len(pieces), "ms": timer.ms})
    return {"document_id": document_id, "filename": filename,
            "kind": kind, "chunks": len(pieces)}


def _scope(debate_id: str, user_id: str) -> qm.Filter:
    """Both ids, always. A guessed debate id must not be enough."""
    return qm.Filter(must=[
        qm.FieldCondition(key="debate_id", match=qm.MatchValue(value=debate_id)),
        qm.FieldCondition(key="user_id", match=qm.MatchValue(value=user_id)),
    ])


async def search(
    *, debate_id: str, user_id: str, query: str, limit: int = 3
) -> List[Dict[str, Any]]:
    """Passages from this case's own documents. [] on any failure.

    Failing soft is the same contract `find_precedents` keeps: a hearing that
    cannot reach the file argues from the structure alone, which is what it
    did before this existed.
    """
    if not query.strip():
        return []
    try:
        await ensure_collection(CASE_DOCUMENTS)
        scope = _scope(debate_id, user_id)
        dense_vector = (await get_embedder().embed([query], query=True))[0]
        sparse_query = await _sparse_vectors([query], query=True)

        # Fetch a wider net from each retriever, then fuse. Same reciprocal-
        # rank approach retrieval.py uses, reusing its constant so the two do
        # not drift apart.
        wide = max(limit * 3, 10)
        searches = [_dense_hits(dense_vector, scope, wide)]
        if sparse_query and sparse_query[0][0]:
            searches.append(_sparse_hits(sparse_query[0], scope, wide))
        results = await asyncio.gather(*searches)

        ranked = _fuse_passages(results[0],
                                results[1] if len(results) > 1 else [])
        return ranked[:limit]
    except Exception as exc:
        log.warning("casefile.search_failed",
                    extra={"debate_id": debate_id, "error": str(exc)[:160]})
        return []


async def _dense_hits(vector: List[float], scope: qm.Filter, limit: int):
    response = await get_client().query_points(
        collection_name=CASE_DOCUMENTS, query=vector, using=DENSE,
        limit=limit, query_filter=scope, with_payload=True,
    )
    return [(p.payload or {}, float(p.score)) for p in response.points]


async def _sparse_hits(sparse, scope: qm.Filter, limit: int):
    indices, values = sparse
    response = await get_client().query_points(
        collection_name=CASE_DOCUMENTS,
        query=qm.SparseVector(indices=indices, values=values),
        using=SPARSE, limit=limit, query_filter=scope, with_payload=True,
    )
    return [(p.payload or {}, float(p.score)) for p in response.points]


def _fuse_passages(dense, sparse) -> List[Dict[str, Any]]:
    """Reciprocal-rank fusion over passages, keyed on the point's identity."""
    merged: Dict[tuple, Dict[str, Any]] = {}

    def key(payload):
        return (payload.get("document_id", ""), payload.get("chunk_index", 0))

    for rank, (payload, score) in enumerate(dense, start=1):
        merged[key(payload)] = {
            "text": payload.get("text", ""),
            "filename": payload.get("filename", ""),
            "document_id": payload.get("document_id", ""),
            "chunk_index": payload.get("chunk_index", 0),
            "score": round(score, 4),
            "_rrf": 1.0 / (RRF_K + rank),
        }
    for rank, (payload, _score) in enumerate(sparse, start=1):
        entry = merged.get(key(payload))
        if entry is not None:
            entry["_rrf"] += 1.0 / (RRF_K + rank)
        else:
            merged[key(payload)] = {
                "text": payload.get("text", ""),
                "filename": payload.get("filename", ""),
                "document_id": payload.get("document_id", ""),
                "chunk_index": payload.get("chunk_index", 0),
                "score": 0.0,
                "_rrf": 1.0 / (RRF_K + rank),
            }

    ordered = sorted(merged.values(), key=lambda e: e["_rrf"], reverse=True)
    for entry in ordered:
        entry.pop("_rrf", None)
    return ordered


async def list_documents(*, debate_id: str, user_id: str) -> List[Dict[str, Any]]:
    """What is in the file, one entry per document."""
    try:
        await ensure_collection(CASE_DOCUMENTS)
        points, _ = await get_client().scroll(
            collection_name=CASE_DOCUMENTS,
            scroll_filter=_scope(debate_id, user_id),
            limit=MAX_CHUNKS_PER_DOCUMENT * 20,
            with_payload=["document_id", "filename", "kind"],
            with_vectors=False,
        )
    except Exception as exc:
        log.warning("casefile.list_failed", extra={"error": str(exc)[:160]})
        return []

    seen: Dict[str, Dict[str, Any]] = {}
    for point in points:
        payload = point.payload or {}
        key = payload.get("document_id", "")
        entry = seen.setdefault(key, {"document_id": key,
                                      "filename": payload.get("filename", ""),
                                      "kind": payload.get("kind", ""),
                                      "chunks": 0})
        entry["chunks"] += 1
    return sorted(seen.values(), key=lambda d: d["filename"])


async def delete_for_debate(debate_id: str, user_id: str) -> None:
    """Drop a case's documents when the case is deleted."""
    try:
        await ensure_collection(CASE_DOCUMENTS)
        await get_client().delete(
            collection_name=CASE_DOCUMENTS,
            points_selector=qm.FilterSelector(filter=_scope(debate_id, user_id)),
            wait=True,
        )
        log.info("casefile.deleted", extra={"debate_id": debate_id})
    except Exception as exc:
        log.warning("casefile.delete_failed", extra={"error": str(exc)[:160]})


def render_passages(passages: Sequence[Dict[str, Any]], budget: int = 1200) -> str:
    """Passages as a prompt block, anchored to their source.

    The anchor is not decoration: it is what makes a quote checkable, and
    what lets the UI show which document a submission came out of.
    """
    if not passages:
        return ""
    lines: List[str] = []
    used = 0
    for passage in passages:
        text = (passage.get("text") or "").strip()
        if not text:
            continue
        anchor = f"{passage.get('filename', 'document')}#{passage.get('chunk_index', 0)}"
        block = f"[{anchor}]\n{text}"
        if used + len(block) > budget * 4:  # ~4 chars per token
            break
        lines.append(block)
        used += len(block)
    return "\n\n".join(lines)
