from langchain_astradb import AstraDBVectorStore
from astrapy.info import VectorServiceOptions
from langchain_core.documents import Document
from typing import List, Dict, Any, Optional
from app.core.config import settings
import os

# Initialize vector store using settings
vector_store = AstraDBVectorStore(
    collection_name="case_laws",
    api_endpoint=settings.ASTRA_DB_API_ENDPOINT,
    token=settings.ASTRA_DB_APPLICATION_TOKEN,
    namespace=settings.ASTRA_DB_KEYSPACE,
    collection_vector_service_options=VectorServiceOptions(
        provider="nvidia",
        model_name="NV-Embed-QA",
    ),
)

def search_by_ipc_section(section_number: str) -> Optional[Document]:
    """
    Directly search for an IPC section by its number (e.g., "302")
    
    Args:
        section_number: The IPC section number to search for
        
    Returns:
        Document if found, None otherwise
    """
    try:
        # Normalize the section number
        normalized_section = section_number.strip().replace(" ", "")
        
        # First try exact match with filter
        results = vector_store.similarity_search(
            query=f"IPC Section {normalized_section}",
            k=1,
            filter={"section_number": {"$eq": normalized_section}}
        )
        
        if results:
            return results[0]
        
        # Fallback to semantic search if exact match not found
        results = vector_store.similarity_search(
            query=f"IPC Section {normalized_section}",
            k=1
        )
        
        # Verify the section number appears in the result
        for doc in results:
            doc_section = doc.metadata.get('section_number', '')
            if normalized_section in doc_section.replace(" ", ""):
                return doc
                
        return None
        
    except Exception as e:
        raise ValueError(f"Error searching IPC section {section_number}: {str(e)}")

def semantic_search_ipc(query: str, limit: int = 2) -> List[Document]:
    """
    Semantic search across IPC sections using natural language
    
    Args:
        query: Natural language query (e.g., "punishment for murder")
        limit: Maximum number of results to return
        
    Returns:
        List of matching Documents
    """
    try:
        return vector_store.similarity_search(
            query=query,
            k=limit
        )
    except Exception as e:
        raise ValueError(f"Error in semantic search: {str(e)}")