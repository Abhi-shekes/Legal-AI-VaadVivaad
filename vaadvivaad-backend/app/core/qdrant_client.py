from qdrant_client import QdrantClient
from qdrant_client.http import models as qdrant_models

from app.core.config import settings

_client = None


def get_qdrant_client() -> QdrantClient:
    global _client
    if _client is None:
        _client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None)
    return _client


def ensure_collection(collection_name: str, vector_size: int = None) -> None:
    """Create the collection if it doesn't exist yet. Idempotent, safe to
    call on every request -- lets the app (and ingest scripts) run against
    a completely empty Qdrant instance with no manual setup step."""
    client = get_qdrant_client()
    if not client.collection_exists(collection_name):
        client.create_collection(
            collection_name=collection_name,
            vectors_config=qdrant_models.VectorParams(
                size=vector_size or settings.EMBEDDING_DIMENSIONS,
                distance=qdrant_models.Distance.COSINE,
            ),
        )
