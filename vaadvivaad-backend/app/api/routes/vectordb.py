from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Dict, Optional
from pydantic import BaseModel

# Import logic functions from controller
from app.controller.vectordbcontroller.find_similar_case import find_similar_cases
from app.controller.vectordbcontroller.search_by_ipc_section import search_by_ipc_section, semantic_search_ipc
from app.controller.vectordbcontroller.search_ipc_evidence import search_by_ipc_section_direct

router = APIRouter()

# ------------------------------
# Response Models
# ------------------------------

class CaseLawResult(BaseModel):
    case: Dict
    similarity_score: float
    key_matches: Dict
    winning_arguments: Dict

class IPCSectionResult(BaseModel):
    section_number: str
    code: str
    status: str
    content: str
    tags: List[str]

class EvidenceResult(BaseModel):
    crime_type: str
    ipc_section: str
    typical_evidence: List[str]
    evidence_category_tags: List[str]

class DefenseArgumentsResponse(BaseModel):
    arguments: List[str]
    relevant_sections: List[str]
    case_references: List[Dict]

class UserOut(BaseModel):
    email: str
    username: str

class Token(BaseModel):
    access_token: str
    token_type: str

# ------------------------------
# Endpoints
# ------------------------------

@router.post("/search-case-laws", response_model=List[CaseLawResult])
async def search_case_laws(incident_description: str, k: int = 5, filters: Optional[dict] = None):
    try:
        results = find_similar_cases(incident_description, k, filters)
        if not results:
            raise HTTPException(status_code=404, detail="No similar cases found")
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching cases: {str(e)}")


@router.post("/search-ipc-sections", response_model=List[IPCSectionResult])
async def search_ipc_sections(query: str, limit: int = 2, exact_section: Optional[str] = None):
    try:
        if exact_section:
            result = search_by_ipc_section(exact_section)
            if not result:
                raise HTTPException(status_code=404, detail=f"IPC Section {exact_section} not found")
            return [IPCSectionResult(
                section_number=result.metadata.get("section_number", "N/A"),
                code=result.metadata.get("code", "N/A"),
                status=result.metadata.get("current_status", "N/A"),
                content=result.page_content,
                tags=result.metadata.get("tags", [])
            )]
        else:
            results = semantic_search_ipc(query, limit)
            if not results:
                raise HTTPException(status_code=404, detail="No matching IPC sections found")
            return [IPCSectionResult(
                section_number=doc.metadata.get("section_number", "N/A"),
                code=doc.metadata.get("code", "N/A"),
                status=doc.metadata.get("current_status", "N/A"),
                content=doc.page_content,
                tags=doc.metadata.get("tags", [])
            ) for doc in results]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching IPC sections: {str(e)}")


@router.post("/search-ipc-evidence", response_model=List[EvidenceResult])
async def search_ipc_evidence(ipc_section: str):
    try:
        results = search_by_ipc_section_direct(ipc_section)
        if not results:
            raise HTTPException(status_code=404, detail=f"No evidence types found for IPC Section {ipc_section}")
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching evidence: {str(e)}")
