from langchain_astradb import AstraDBVectorStore
from langchain_core.documents import Document
from astrapy.info import VectorServiceOptions
from app.core.config import settings
from typing import List, Dict, Any

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


def find_similar_cases(incident_description: str, k: int = 1, min_score: float = 0.70):
    """
    Find similar cases with semantic search + optional metadata filter.
    Returns [] if nothing matches or fails min_score.
    """
    try:
        
        results_with_scores = vector_store.similarity_search_with_score(
            query=incident_description,
            k=k,
            filter={
                
        "court": {"$in": ["Supreme Court of India", "High Court", "District Court", "N/A"]},

    
            }
        )

        similar_cases = []
        for doc, score in results_with_scores:
            if score >= 0.70: # Apply min_score filtering
                formatted_case = format_case_details(doc.metadata)
                similar_cases.append({"case": formatted_case, "similarity_score": score})
        
        return similar_cases
    except Exception as e:
        print(f"Error in vector search: {str(e)}")
        return []

def format_case_details(case_data: dict) -> dict:
    return {
        "case_name": case_data.get("case_id_name", "N/A"),
        "court": case_data.get("court", "N/A"),
        "date": case_data.get("date_of_judgment", "N/A"),
        "ipc_sections": case_data.get("ipc_sections", []),
        "summary": case_data.get("case_summary", ""),
        "verdict": case_data.get("verdict_outcome", "N/A"),
        "legal_issues": case_data.get("legal_issues", []),
        "judgment_text": case_data.get("judgment_text", ""),
        "defense_raised": case_data.get("defense_raised", []),
        "evidence_discussed": case_data.get("evidence_discussed", []),
        "crime_type": case_data.get("crime_type", "N/A"),
        "precedents": case_data.get("key_precedents_cited", []),
        "severity": case_data.get("severity", "N/A"),
    }

async def main():
    incident = (
        "dowry death"
    )

    relaxed_filters = {
        "court": {"$in": ["Supreme Court of India", "High Court", "District Court", "N/A"]},

    }



    similar_cases = find_similar_cases(
        incident_description=incident,
        k=1,
        min_score=0.60, # Lowered min_score to catch potentially less perfect matches
        metadata_filters=relaxed_filters # Using relaxed filters for broader results
    )

    if similar_cases:
        case = similar_cases[0]
        details = case["case"]

        result = {
            "status" : "success",
            "case_name": details["case_name"],
            "similarity_score": round(case["similarity_score"], 2),
            "details": {
                "court": details["court"],
                "date": details["date"],
                "ipc_sections": details["ipc_sections"],
                "crime_type": details["crime_type"],
                "severity": details["severity"],
                "verdict": details["verdict"],
                "summary": details["summary"],
                "legal_issues": details["legal_issues"],
                "defense_raised": details["defense_raised"],
                "evidence_discussed": details["evidence_discussed"],
                "judgment_text": details["judgment_text"],
                "precedents": details["precedents"],
            }
        }

        print(result)
    else:
        print({"status": "fail" , "message" : "No Similar Case Found in DB"})

