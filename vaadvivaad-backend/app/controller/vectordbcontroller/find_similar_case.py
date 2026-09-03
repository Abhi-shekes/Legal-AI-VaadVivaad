from langchain_qdrant import QdrantVectorStore
from qdrant_client.http import models as qdrant_models

from app.core.embeddings import GeminiEmbeddings
from app.core.qdrant_client import ensure_collection, get_qdrant_client

COLLECTION_NAME = "case_laws"

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


def find_similar_cases(incident_description: str):
    """
    Find similar cases with semantic search + optional metadata filter.
    Returns [] if nothing matches or if the collection is empty/unreachable.
    """
    try:
        vector_store = _get_vector_store()
        results_with_scores = vector_store.similarity_search_with_score(
            query=incident_description,
            k=1,
            filter=qdrant_models.Filter(
                must=[
                    qdrant_models.FieldCondition(
                        key="metadata.court",
                        match=qdrant_models.MatchAny(
                            any=["Supreme Court of India", "High Court", "District Court", "N/A"]
                        ),
                    )
                ]
            ),
        )

        similar_cases = []
        for doc, score in results_with_scores:
            if score >= 0.70:
                formatted_case = format_case_details(doc.metadata)
                similar_cases.append({"case": formatted_case, "similarity_score": score})

        return similar_cases

    except Exception as e:
        print(f"Error in vector search: {e}")
        return []  # Unified empty result for both collection-not-found and no match


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
