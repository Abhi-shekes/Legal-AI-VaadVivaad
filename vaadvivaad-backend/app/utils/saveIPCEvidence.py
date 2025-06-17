from langchain_astradb import AstraDBVectorStore
from astrapy.info import VectorServiceOptions
from langchain_core.documents import Document
from app.core.config import settings
import json
import argparse
from typing import Dict



# Initialize vector store
vector_store = AstraDBVectorStore(
    collection_name="evidence_type",
    api_endpoint=settings.ASTRA_DB_API_ENDPOINT,
    token=settings.ASTRA_DB_APPLICATION_TOKEN,
    namespace=settings.ASTRA_DB_KEYSPACE,
    collection_vector_service_options=VectorServiceOptions(
        provider="nvidia",
        model_name="NV-Embed-QA",
    ),
)


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
        vector_store.add_documents(documents=[document])
        print(f"Stored evidence for {evidence_data.get('crime_type', 'unknown')} (IPC: {evidence_data.get('ipc_section', '')})")
    except Exception as e:
        print(f"Error storing evidence: {str(e)}")




