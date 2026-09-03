from langchain_core.documents import Document
from langchain_qdrant import QdrantVectorStore
from typing import Dict

from app.core.embeddings import GeminiEmbeddings
from app.core.qdrant_client import ensure_collection, get_qdrant_client

COLLECTION_NAME = "case_laws"

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
    Store a single case in Qdrant as a vector embedding

    Args:
        case_data: Dictionary containing case information

    Returns:
        bool: True if successful, False otherwise
    """
    if not case_data:
        print("Skipping save: no case data to store")
        return False
    try:
        # Prepare document for insertion
        document = prepare_case_document(case_data)

        # Store in Qdrant
        result = _get_vector_store().add_documents(documents=[document])

        if result and len(result) == 1:
            print(f"Successfully stored case {case_data.get('case_id_name', 'unknown')} in Qdrant")
            return True
        else:
            print(f"Failed to store case {case_data.get('case_id_name', 'unknown')}")
            return False
            
    except Exception as e:
        print(f"Error storing case: {str(e)}")
        return False


