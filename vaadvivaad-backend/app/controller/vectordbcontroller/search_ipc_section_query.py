from langchain_astradb import AstraDBVectorStore
from astrapy.info import VectorServiceOptions
from langchain_core.documents import Document
from typing import List, Dict, Any
from app.core.config import settings
import re

# Initialize vector store
vector_store = AstraDBVectorStore(
    collection_name="ipc_sections",
    api_endpoint=settings.ASTRA_DB_API_ENDPOINT,
    token=settings.ASTRA_DB_APPLICATION_TOKEN,
    namespace=settings.ASTRA_DB_KEYSPACE,
    collection_vector_service_options=VectorServiceOptions(
        provider="nvidia",
        model_name="NV-Embed-QA",
    ),
)

def search_ipc_section_query(query: str, limit: int = 1) -> List[Dict[str, Any]]:
    """
    Hybrid search that:
    1. First tries exact matches in metadata fields using supported operators
    2. Falls back to semantic search with strict filtering
    
    Args:
        query: Search query (e.g., "cheating", "murder punishment")
        limit: Maximum results to return
    
    Returns:
        List of matching IPC sections with full details
    """
    try:
        # Clean and prepare query for exact matching
        clean_query = query.strip().lower()
        
        # Phase 1: Try exact matches in metadata fields using supported operators
        exact_match_filter = {
            "code": "Indian Penal Code (IPC)",
            "$or": [
                {"section_number": clean_query},  # Exact match
                {"tags": clean_query}  # Contains operator works for arrays
            ]
        }
        
        # Use similarity search with filter for exact matches
        exact_matches = vector_store.similarity_search_with_score(
            query=query,
            k=limit,
            filter=exact_match_filter
        )
        
        # Filter for good matches (score > 0.8 for exact matches)
        filtered_exact_matches = [
            doc for doc, score in exact_matches 
            if score >= 0.8
        ]
        
        if filtered_exact_matches:
            return [_format_result(doc) for doc in filtered_exact_matches]
        
        # Phase 2: Fall back to regular semantic search with IPC filter
        semantic_results = vector_store.similarity_search_with_score(
            query=query,
            k=limit,
            filter={"code": "Indian Penal Code (IPC)"}
        )
        
        # Apply quality threshold (0.7 for general semantic matches)
        semantic_matches = [
            doc for doc, score in semantic_results 
            if score >= 0.7
        ]
        
        return [_format_result(doc) for doc in semantic_matches]
    
    except Exception as e:
        print(f"Search error: {str(e)}")
        return []

def _format_result(doc: Document) -> Dict[str, Any]:
    """Formats a document into the standard IPC section result format"""
    if not hasattr(doc, 'metadata'):
        return {}
        
    metadata = doc.metadata
    full_data = metadata.get('full_data', {})
    
    # Extract punishments details
    punishment_details = []
    for punishment in full_data.get('typical_punishments', {}).get('punishments', []):
        punishment_details.append({
            'type': punishment.get('type', ''),
            'description': punishment.get('description', ''),
            'conditions': punishment.get('conditions'),
            'example_cases': punishment.get('example_cases')
        })
    
    # Extract elements of offense
    elements = []
    for element in full_data.get('elements_of_offense', {}).get('essential_elements', []):
        elements.append({
            'element': element.get('element', ''),
            'description': element.get('description', '')
        })
    
    # Extract exceptions and defenses
    exceptions_defenses = []
    exceptions = full_data.get('exceptions_or_defenses', {}).get('exceptions', [])
    defenses = full_data.get('exceptions_or_defenses', {}).get('defenses', [])
    
    for item in exceptions + defenses:
        exceptions_defenses.append({
            'name': item.get('exception') or item.get('defense', ''),
            'description': item.get('description', ''),
            'conditions': item.get('conditions'),
            'outcome': item.get('outcome')
        })
    
    # Build complete result
    return {
        # Basic Info
        'section_number': metadata.get('section_number', ''),
        'code': full_data.get('code', 'Indian Penal Code (IPC)'),
        'description': full_data.get('description', ''),
        'current_status': metadata.get('current_status', ''),
        
        # Classification
        'tags': metadata.get('tags', []),
        'cognizable': metadata.get('cognizable'),
        'bailable': metadata.get('bailable'),
        'compoundable': metadata.get('compoundable'),
        
        # Legal Elements
        'elements_of_offense': elements,
        'mens_rea': full_data.get('elements_of_offense', {}).get('mens_rea', ''),
        'proof_requirement': full_data.get('elements_of_offense', {}).get('proof_requirement', ''),
        
        # Punishments
        'punishment_types': metadata.get('punishment_types', []),
        'punishment_details': punishment_details,
        'sentencing_considerations': {
            'aggravating_factors': full_data.get('typical_punishments', {}).get('sentencing_considerations', {}).get('aggravating_factors', []),
            'mitigating_factors': full_data.get('typical_punishments', {}).get('sentencing_considerations', {}).get('mitigating_factors', [])
        },
        
        # Defenses
        'exceptions_defenses': exceptions_defenses,
        'burden_of_proof': full_data.get('exceptions_or_defenses', {}).get('burden_of_proof', ''),
        
        # Related Sections
        'related_sections': full_data.get('legal_framework', {}).get('related_sections', [])
    }