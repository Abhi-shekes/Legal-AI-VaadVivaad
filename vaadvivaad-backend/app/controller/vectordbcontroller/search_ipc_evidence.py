from typing import List

from langchain_qdrant import QdrantVectorStore
from qdrant_client.http import models as qdrant_models

from app.core.embeddings import GeminiEmbeddings
from app.core.qdrant_client import ensure_collection, get_qdrant_client

COLLECTION_NAME = "evidence_type"

# Initialize vector store lazily so the app can boot without a reachable Qdrant instance
_vector_store = None


def _get_vector_store():
    global _vector_store
    if _vector_store is None:
        ensure_collection(COLLECTION_NAME)
        _vector_store = QdrantVectorStore(
            client=get_qdrant_client(),
            collection_name=COLLECTION_NAME,
            embedding=GeminiEmbeddings(),
        )
    return _vector_store


def search_evidence_by_ipc_section(ipc_section: str) -> List[dict]:
    try:
        vector_store = _get_vector_store()
        # Using similarity_search with metadata filter
        results = vector_store.similarity_search(
            query=f"IPC Section {ipc_section}",  # Needed for vector search
            k=1,
            filter=qdrant_models.Filter(
                must=[
                    qdrant_models.FieldCondition(
                        key="metadata.ipc_section",
                        match=qdrant_models.MatchValue(value=ipc_section),
                    )
                ]
            ),
        )

        # Format results using the Pydantic model
        formatted_results = []
        for doc in results:
            metadata = doc.metadata
            formatted_results.append({
                "crime_type": metadata.get("crime_type"),
                "ipc_section": metadata.get("ipc_section"),
                "typical_evidence": metadata.get("typical_evidence", []),
                "evidence_category_tags": metadata.get("evidence_category_tags", [])
            })

        return formatted_results

    except Exception as e:
        print(f"Error in vector search: {e}")
        return []  # Unified empty result for both collection-not-found and no match
