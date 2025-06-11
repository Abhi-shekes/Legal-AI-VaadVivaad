# vectordb.py

from fastapi import APIRouter, HTTPException, Query, status, Depends
from typing import List, Dict, Optional
from pydantic import BaseModel
import asyncio

# Import logic functions from controller
from app.controller.vectordbcontroller.find_similar_case import find_similar_cases
from app.controller.vectordbcontroller.search_by_ipc_section import search_by_ipc_section
from app.controller.vectordbcontroller.search_ipc_section_query import search_ipc_section_query
from app.controller.vectordbcontroller.search_ipc_evidence import search_by_ipc_section_direct

router = APIRouter()

# ------------------------------
# Response Models
# ------------------------------

class PunishmentDetail(BaseModel):
    type: str
    description: str
    conditions: Optional[str] = None
    example_cases: Optional[List[str]] = None

class ElementOfOffense(BaseModel):
    element: str
    description: str

class ExceptionDefense(BaseModel):
    name: str
    description: str
    conditions: Optional[str] = None
    outcome: Optional[str] = None

class IPCSectionResult(BaseModel):
    # Basic Info
    section_number: str
    code: str
    description: str
    current_status: str
    
    # Classification
    tags: List[str]
    cognizable: Optional[bool] = None
    bailable: Optional[bool] = None
    compoundable: Optional[bool] = None
    
    # Legal Elements
    elements_of_offense: List[ElementOfOffense]
    mens_rea: Optional[str] = None
    proof_requirement: Optional[str] = None
    
    # Punishments
    punishment_types: List[str]
    punishment_details: List[PunishmentDetail]
    sentencing_considerations: Dict[str, List[str]]
    
    # Defenses
    exceptions_defenses: List[ExceptionDefense]
    burden_of_proof: Optional[str] = None
    
    # Related Sections
    related_sections: List[Dict[str, str]]

class CaseLawResult(BaseModel):
    case: Dict
    similarity_score: float
    key_matches: Dict
    winning_arguments: Dict

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

# Nested model for details field
class CaseDetails(BaseModel):
    court: str
    date: str
    ipc_sections: List[str]
    crime_type: str
    severity: str
    verdict: str
    summary: str
    legal_issues: List[str]
    defense_raised: List[str]
    evidence_discussed: List[str]
    judgment_text: str
    precedents: List[str]

# --- New Models for Similar Case Search ---
class SimilarCaseRequest(BaseModel):
    incident_description: str
    k: int = 3
    min_score: float = 0.78

class SimilarCaseDetailResponse(BaseModel):
    court: str
    date: str
    ipc_sections: List[str]
    crime_type: str
    severity: str
    verdict: str
    summary: str
    legal_issues: List[str]
    defense_raised: List[str]
    evidence_discussed: List[str]
    judgment_text: str
    precedents: List[str]

class SimilarCaseResponse(BaseModel):
    status: str
    case_name: Optional[str] = None
    similarity_score: Optional[float] = None
    details: Optional[SimilarCaseDetailResponse] = None
    message: Optional[str] = None


# ------------------------------
# Endpoints
# ------------------------------

@router.post("/search-case-laws", response_model=SimilarCaseResponse)
async def search_case_laws(request: SimilarCaseRequest):
    try:

        similar_cases = find_similar_cases(
            incident_description= request.incident_description
        )

        if similar_cases:
            case = similar_cases[0]  # Only take the first similar case
            details = case["case"]


            return SimilarCaseResponse(
                status="success",
                case_name=details["case_name"],
                similarity_score = round(case["similarity_score"], 2),
                details=SimilarCaseDetailResponse(
                    court=details["court"],
                    date=details["date"],
                    ipc_sections=details["ipc_sections"],
                    crime_type=details["crime_type"],
                    severity=details["severity"],
                    verdict=details["verdict"],
                    summary=details["summary"],
                    legal_issues=details["legal_issues"],
                    defense_raised=details["defense_raised"],
                    evidence_discussed=details["evidence_discussed"],
                    judgment_text=details["judgment_text"],
                    precedents=details["precedents"]
                )
            )
        else:
            return SimilarCaseResponse(status="fail", message="No Similar Case Found in DB")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching similar cases: {str(e)}")


@router.post("/search-ipc-sections", response_model=List[IPCSectionResult])
def search_ipc_sections(section: Optional[str] = Query(None), query: Optional[str] = Query(None)):
    try:
        if section:
            results = search_by_ipc_section(section)
        elif query:
            results = search_ipc_section_query(query)
        else:
            raise HTTPException(status_code=400, detail="Either 'section' or 'query' must be provided")
        
        return results if results else []
        
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