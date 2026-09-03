"""Async Qdrant access and collection management.

Two changes of substance from the previous version:

* The client is async, so retrieval no longer blocks the event loop.
* **The application never writes to the corpus.** Collections are created
  read-shaped here; the only writer is the offline ingest job in
  `app/services/ingest/`. That boundary is what closes the hallucination
  feedback loop, where model-invented "precedent" was persisted and then
  retrieved as ground truth by the next user.
"""

from __future__ import annotations

from typing import Optional

from qdrant_client import AsyncQdrantClient
from qdrant_client.http import models as qm

from app.core.config import settings
from app.core.logging import get_logger

log = get_logger(__name__)

# Judgments from the curated corpus. Retrieval-only for the application.
CASE_LAWS = "case_laws"
# Statute reference text (IPC / BNS sections).
STATUTES = "statutes"

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
}


async def ensure_collection(name: str, vector_size: Optional[int] = None) -> None:
    """Create the collection and its payload indexes if absent. Idempotent."""
    client = get_client()
    if not await client.collection_exists(name):
        await client.create_collection(
            collection_name=name,
            vectors_config=qm.VectorParams(
                size=vector_size or settings.EMBEDDING_DIMENSIONS,
                distance=qm.Distance.COSINE,
            ),
        )
        log.info("qdrant.collection_created", extra={"collection": name})

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


async def ensure_all() -> None:
    for name in (CASE_LAWS, STATUTES):
        await ensure_collection(name)


async def count(name: str) -> int:
    client = get_client()
    if not await client.collection_exists(name):
        return 0
    return (await client.count(collection_name=name, exact=True)).count
