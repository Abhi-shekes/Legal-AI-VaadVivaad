from http.client import HTTPException
from langchain_astradb import AstraDBVectorStore
from astrapy.info import VectorServiceOptions
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.core.config import settings
import os


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


def search_evidence_by_ipc_section(ipc_section: str) -> List[str]:
    
    
    try:
        # Using similarity_search with metadata filter
        results = vector_store.similarity_search(
            query=f"IPC Section {ipc_section}",  # Needed for vector search
            k=1,
            filter={"ipc_section": {"$eq": ipc_section}}  # Metadata filter
        )

        
        # Format results using the Pydantic model
        formatted_results = []
        for doc in results:
            metadata = doc.metadata
            formatted_results.append({
                "crime_type" : metadata.get("crime_type"),
                "ipc_section" : metadata.get("ipc_section"),
                "typical_evidence" : metadata.get("typical_evidence", []),
                "evidence_category_tags" :metadata.get("evidence_category_tags", [])
            })
        
        return formatted_results
    
    except Exception as e:

        error_message = str(e)
        if "COLLECTION_NOT_EXIST" in error_message or "collection name: case_laws" in error_message:
            print("Collection does not exist, returning empty case list.")
        else:
            print(f"Error in vector search: {error_message}")
        return []  # Unified empty result for both collection-not-found and no match
    
