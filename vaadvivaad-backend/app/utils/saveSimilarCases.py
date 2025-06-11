from langchain_astradb import AstraDBVectorStore
from astrapy.info import VectorServiceOptions
from langchain_core.documents import Document
from app.core.config import settings
from typing import Dict


# Initialize vector store (moved to module level for reuse)
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


def prepare_case_document(case: Dict) -> Document:
    """Convert a single case JSON to LangChain Document format"""
    # Combine key fields for embedding
    content_parts = [
        case.get("case_id_name", ""),
        ", ".join(case.get("ipc_sections", [])),
        case.get("court", ""),
        case.get("case_summary", ""),
        " ".join(case.get("legal_issues", [])),
        case.get("judgment_text", ""),
        case.get("crime_type", "")
    ]
    
    # Create LangChain Document object
    return Document(
        page_content="\n\n".join(content_parts),
        metadata=case  # Store all original data as metadata
    )


def saveSimilarCases(case_data: Dict) -> bool:
    """
    Store a single case in Astra DB as vector embedding
    
    Args:
        case_data: Dictionary containing case information
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Prepare document for insertion
        document = prepare_case_document(case_data)
        
        # Store in Astra DB
        result = vector_store.add_documents(documents=[document])
        
        if result and len(result) == 1:
            print(f"Successfully stored case {case_data.get('case_id_name', 'unknown')} in Astra DB")
            return True
        else:
            print(f"Failed to store case {case_data.get('case_id_name', 'unknown')}")
            return False
            
    except Exception as e:
        print(f"Error storing case: {str(e)}")
        return False


