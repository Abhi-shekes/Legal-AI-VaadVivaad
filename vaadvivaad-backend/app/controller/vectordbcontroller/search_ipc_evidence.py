from http.client import HTTPException
from langchain_astradb import AstraDBVectorStore
from astrapy.info import VectorServiceOptions
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.core.config import settings
import os

# Response Model
class EvidenceResult(BaseModel):
    crime_type: Optional[str]
    ipc_section: Optional[str]
    typical_evidence: List[str]
    evidence_category_tags: List[str]

# Initialize vector store
# Initialize vector store using settings
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


def search_by_ipc_section_direct(ipc_section: str) -> List[EvidenceResult]:
    """
    Search evidence types by IPC section number using metadata filtering
    
    Args:
        ipc_section: The IPC section number to search for (e.g., "302")
        
    Returns:
        List of EvidenceResult objects containing:
        - crime_type: Type of crime
        - ipc_section: IPC section number
        - typical_evidence: List of typical evidence
        - evidence_category_tags: List of evidence categories
    """
    try:
        # Using similarity_search with metadata filter
        results = vector_store.similarity_search(
            query=f"IPC Section {ipc_section}",  # Needed for vector search
            k=10,
            filter={"ipc_section": {"$eq": ipc_section}}  # Metadata filter
        )
        
        # Format results using the Pydantic model
        formatted_results = []
        for doc in results:
            metadata = doc.metadata
            formatted_results.append(EvidenceResult(
                crime_type=metadata.get("crime_type"),
                ipc_section=metadata.get("ipc_section"),
                typical_evidence=metadata.get("typical_evidence", []),
                evidence_category_tags=metadata.get("evidence_category_tags", [])
            ))
        
        return formatted_results
    
    except Exception as e:
        # This will be caught by FastAPI's exception handler
        raise HTTPException(
            status_code=500,
            detail=f"Error searching for IPC section {ipc_section}: {str(e)}"
        )