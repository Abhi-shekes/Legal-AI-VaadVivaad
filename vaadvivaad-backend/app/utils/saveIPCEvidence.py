from langchain_core.documents import Document
from langchain_qdrant import QdrantVectorStore
import json
import argparse
from typing import Dict

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


def prepare_evidence_document(evidence: Dict) -> Document:
    """Convert evidence type JSON to LangChain Document format (PRESERVING ORIGINAL STRUCTURE)"""
    # EXACTLY matching your original content preparation
    content_parts = [
        f"Crime Type: {evidence.get('crime_type', '')}",
        f"IPC Section: {evidence.get('ipc_section', '')}",
        "Typical Evidence: " + ", ".join(evidence.get('typical_evidence', [])),
        "Evidence Categories: " + ", ".join(evidence.get('evidence_category_tags', []))
    ]
    
    # PRESERVING your original metadata structure (full evidence data)
    doc = Document(
        page_content="\n".join(content_parts),
        metadata=evidence  # Exactly as in your original
    )
    return doc


def saveIPCEvidence(evidence_data: Dict):
    """Store a single evidence type preserving original table structure"""
    try:

        document = prepare_evidence_document(evidence_data)
        _get_vector_store().add_documents(documents=[document])
        print(f"Stored evidence for {evidence_data.get('crime_type', 'unknown')} (IPC: {evidence_data.get('ipc_section', '')})")
    except Exception as e:
        print(f"Error storing evidence: {str(e)}")




