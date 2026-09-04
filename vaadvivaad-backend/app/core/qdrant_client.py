"""Async Qdrant access and collection management.

Three changes of substance from the original version:

* The client is async, so retrieval no longer blocks the event loop.
* **The application never writes to the corpus.** Collections are created
  read-shaped here; the only writer is the offline ingest job in
  `app/services/ingest/`. That boundary is what closes the hallucination
  feedback loop, where model-invented "precedent" was persisted and then
  retrieved as ground truth by the next user.
* Vectors are **named**, and a BM25 sparse vector sits beside the dense one
  so retrieval can fuse both server-side. Qdrant applies IDF itself
  (`Modifier.IDF`), which keeps the corpus statistics in the index instead of
  in a Python object that would have to be kept in sync with it.

The named-vector layout is not compatible with a collection created by the
earlier unnamed-vector code, and neither is a change of embedding provider,
which changes the vector width. Both are detected at boot by
`check_schema()`, which logs the exact command to fix it rather than letting
queries fail one at a time later.
"""

from __future__ import annotations

from typing import List, Optional, Tuple

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qm

from app.core.config import settings
from app.core.embeddings import DENSE, SPARSE, get_embedder
from app.core.logging import get_logger

log = get_logger(__name__)

# Judgments from the curated corpus. Retrieval-only for the application.
CASE_LAWS = "case_laws"
# Statute reference text (IPC / BNS sections).
STATUTES = "statutes"
# The user's own uploaded case files, chunked. Unlike the two above this is
# written from the request path -- but it is per-user private data, never
# citable authority, and it is filtered by debate_id AND user_id on every
# read. The corpus boundary is unaffected: nothing here is ever retrieved as
# precedent.
CASE_DOCUMENTS = "case_documents"

_client: Optional[AsyncQdrantClient] = None


def get_client() -> AsyncQdrantClient:
    global _client
    if _client is None:
        _client = AsyncQdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY or None,
            timeout=20,
        )
    return _client


async def close_client() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None


# Payload fields that are filtered or boosted on, and therefore need an index.
# Without these Qdrant falls back to a full scan for every filtered query.
_INDEXES = {
    CASE_LAWS: {
        "citation_id": qm.PayloadSchemaType.KEYWORD,
        "sections": qm.PayloadSchemaType.KEYWORD,
        "codes": qm.PayloadSchemaType.KEYWORD,
        "court_rank": qm.PayloadSchemaType.INTEGER,
        "year": qm.PayloadSchemaType.INTEGER,
        "verified": qm.PayloadSchemaType.BOOL,
    },
    STATUTES: {
        "section": qm.PayloadSchemaType.KEYWORD,
        "code": qm.PayloadSchemaType.KEYWORD,
    },
    CASE_DOCUMENTS: {
        # The tenant keys. Without indexes here every per-case search would
        # be a full scan of every user's documents.
        "debate_id": qm.PayloadSchemaType.KEYWORD,
        "user_id": qm.PayloadSchemaType.KEYWORD,
        "document_id": qm.PayloadSchemaType.KEYWORD,
    },
}


def _vectors_config(vector_size: Optional[int] = None) -> dict:
    size = vector_size or get_embedder().dimensions
    return {DENSE: qm.VectorParams(size=size, distance=qm.Distance.COSINE)}


def _sparse_config() -> Optional[dict]:
    """IDF is applied by Qdrant, not by fastembed.

    `SparseTextEmbedding` emits raw term frequencies; the document-frequency
    half of BM25 depends on the whole corpus, which only the index knows.
    """
    if not settings.HYBRID_SEARCH:
        return None
    return {
        SPARSE: qm.SparseVectorParams(
            index=qm.SparseIndexParams(on_disk=False),
            modifier=qm.Modifier.IDF,
        )
    }


async def _create(name: str, vector_size: Optional[int] = None) -> None:
    await get_client().create_collection(
        collection_name=name,
        vectors_config=_vectors_config(vector_size),
        sparse_vectors_config=_sparse_config(),
    )
    log.info("qdrant.collection_created",
             extra={"collection": name,
                    "size": vector_size or get_embedder().dimensions,
                    "hybrid": bool(_sparse_config())})


async def _ensure_indexes(name: str) -> None:
    client = get_client()
    for field, schema in _INDEXES.get(name, {}).items():
        try:
            await client.create_payload_index(
                collection_name=name, field_name=field, field_schema=schema, wait=False
            )
        except Exception as exc:  # already exists, or a benign race
            if "already exists" not in str(exc).lower():
                log.debug("qdrant.index_skipped",
                          extra={"collection": name, "field": field,
                                 "error": str(exc)[:120]})


async def ensure_collection(name: str, vector_size: Optional[int] = None) -> None:
    """Create the collection and its payload indexes if absent. Idempotent."""
    if not await get_client().collection_exists(name):
        await _create(name, vector_size)
    await _ensure_indexes(name)


async def recreate_collection(name: str, vector_size: Optional[int] = None) -> None:
    """Drop and rebuild. Destroys every point — ingest must follow.

    Reached only from `python -m app.services.ingest.pipeline --recreate`.
    Nothing in the request path may call this.
    """
    client = get_client()
    if await client.collection_exists(name):
        await client.delete_collection(collection_name=name)
        log.warning("qdrant.collection_dropped", extra={"collection": name})
    await _create(name, vector_size)
    await _ensure_indexes(name)


async def describe(name: str) -> Tuple[Optional[int], bool]:
    """(dense vector width, has the sparse vector) for an existing collection.

    Width is None when the collection predates named vectors, which is the
    shape the earlier code created.
    """
    info = await get_client().get_collection(collection_name=name)
    params = info.config.params
    vectors = params.vectors
    size: Optional[int] = None
    if isinstance(vectors, dict):
        dense = vectors.get(DENSE)
        if dense is not None:
            size = dense.size
    sparse = getattr(params, "sparse_vectors", None) or {}
    return size, SPARSE in sparse


async def check_schema() -> List[str]:
    """Report collections whose shape no longer matches the configuration.

    Returns human-readable problems, empty when everything lines up. Called
    at boot so a width mismatch surfaces once, with the fix, instead of as a
    silently empty result on every search.
    """
    expected = get_embedder().dimensions
    problems: List[str] = []
    client = get_client()

    for name in (CASE_LAWS, STATUTES, CASE_DOCUMENTS):
        if not await client.collection_exists(name):
            continue
        try:
            size, has_sparse = await describe(name)
        except Exception as exc:
            problems.append(f"{name}: could not be inspected ({str(exc)[:80]})")
            continue

        if size is None:
            problems.append(
                f"{name}: was built with an unnamed vector, before hybrid "
                f"retrieval. Rebuild it with `--recreate`."
            )
        elif size != expected:
            problems.append(
                f"{name}: indexed at {size} dimensions but "
                f"{settings.EMBEDDING_PROVIDER} embeddings are {expected}. "
                f"Rebuild it with `--recreate`."
            )
        elif settings.HYBRID_SEARCH and not has_sparse:
            problems.append(
                f"{name}: has no sparse vector, so hybrid search will fall "
                f"back to dense-only. Rebuild it with `--recreate` to enable it."
            )

    if problems:
        log.error("qdrant.schema_mismatch",
                  extra={"problems": problems,
                         "fix": "python -m app.services.ingest.pipeline "
                                "--recreate --source fixtures/seed_corpus.jsonl"})
    return problems


async def ensure_all() -> None:
    for name in (CASE_LAWS, STATUTES, CASE_DOCUMENTS):
        await ensure_collection(name)
    await check_schema()


async def count(name: str) -> int:
    client = get_client()
    if not await client.collection_exists(name):
        return 0
    return (await client.count(collection_name=name, exact=True)).count
