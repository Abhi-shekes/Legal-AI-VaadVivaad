import os
from langchain_astradb import AstraDBVectorStore
from astrapy.info import VectorServiceOptions
from typing import List, Dict, Any, Optional
from app.core.config import settings

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


def find_similar_cases(incident_description: str, k: int = 5, filters: Optional[Dict] = None) -> List[Dict[str, Any]]:
    """
    Find similar legal cases with comprehensive details for legal arguments
    
    Args:
        incident_description: Description of the incident to find similar cases for
        k: Number of similar cases to return
        filters: Optional filters to apply to the search
    
    Returns:
        List of dictionaries containing case details, similarity scores, key matches, and winning arguments
    """
    try:
        results = vector_store.similarity_search_with_score(
            query=incident_description,
            k=k,
            filter=filters
        )
        
        if not results:
            return []

        similar_cases = []
        for doc, score in results:
            case_data = doc.metadata
            similar_cases.append({
                "case": format_case_details(case_data),
                "similarity_score": float(score),
                "key_matches": get_key_matches(incident_description, case_data),
                "winning_arguments": extract_winning_arguments(case_data)
            })
        
        return similar_cases

    except Exception as e:
        print(f"Error searching cases: {str(e)}")
        return []

def format_case_details(case_data: Dict) -> Dict:
    """Format case details for better presentation"""
    return {
        "case_name": case_data.get("case_id_name", "N/A"),
        "court": case_data.get("court", "N/A"),
        "date": case_data.get("date_of_judgment", "N/A"),
        "ipc_sections": case_data.get("ipc_sections", []),
        "summary": case_data.get("case_summary", ""),
        "verdict": case_data.get("verdict_outcome", "N/A"),
        "legal_issues": case_data.get("legal_issues", []),
        "key_precedents": case_data.get("key_precedents_cited", []),
        "evidence_discussed": case_data.get("evidence_discussed", []),
        "defense_arguments": case_data.get("defense_raised", [])
    }

def extract_winning_arguments(case_data: Dict) -> Dict:
    """Extract valuable winning arguments from the case"""
    return {
        "successful_defense_strategies": case_data.get("defense_raised", []),
        "critical_evidence_gaps": case_data.get("evidence_discussed", []),
        "key_legal_principles": case_data.get("legal_issues", []),
        "precedents_used": case_data.get("key_precedents_cited", []),
        "reasoning_for_verdict": case_data.get("judgment_text", "")
    }

def get_key_matches(query: str, case_data: Dict) -> Dict:
    """
    Identify which parts of the case most match the query
    
    Args:
        query: The search query
        case_data: Metadata from the case document
    
    Returns:
        Dictionary of matching elements
    """
    matches = {}
    query_lower = query.lower()
    
    # Check IPC sections
    if "ipc_sections" in case_data:
        matches["ipc_sections"] = [
            section for section in case_data["ipc_sections"] 
            if section.lower() in query_lower
        ]
    
    # Check crime type
    if "crime_type" in case_data and case_data["crime_type"].lower() in query_lower:
        matches["crime_type"] = case_data["crime_type"]
    
    # Check court
    if "court" in case_data and case_data["court"].lower() in query_lower:
        matches["court"] = case_data["court"]
    
    return matches