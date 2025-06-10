from fastapi import APIRouter
from pydantic import BaseModel

from app.controller.geminiController.ARGUMENT_MAIN import generate_argument, generate_argument_first_time
from app.controller.geminiController.COUNTER_ARGUMENT_MAIN import generate_counter_argument, generate_counter_argument_first_time
from app.controller.geminiController.DRAFT_USER_INPUT_MAIN import generate_user_prompt_properly
from app.controller.geminiController.EVIDENCE_MAIN import generate_evidence_for_section
from app.controller.geminiController.IPC_SECTION_MAIN import generate_ipc_section
from app.controller.geminiController.SIMILAR_CASES_MAIN import get_similar_cases_for_section
from app.controller.geminiController.SUMMARY_MAIN import get_summary
from app.schemas.legal_gen import ArgumentRequest, ArgumentRequestFirstTime, EvidenceRequest, IPCSectionRequest, SimilarCasesRequest, SummaryRequest, UserPromptRequest


router = APIRouter()





@router.post("/generate_argument_first_time")
def api_generate_argument_first_time(data: ArgumentRequestFirstTime):
    result = generate_argument_first_time(
        data.case_summary,
        data.similar_cases,
        data.ipc_sections_with_desc,
        data.evidence_types,
    )
    return {"result": result}

@router.post("/generate_argument")
def api_generate_argument(data: ArgumentRequest):
    result = generate_argument(
        data.case_summary,
        data.similar_cases,
        data.ipc_sections_with_desc,
        data.evidence_types,
        data.previous_argument,
    )
    return {"result": result}

@router.post("/generate_counter_argument_first_time")
def api_generate_counter_argument_first_time(data: ArgumentRequestFirstTime):
    result = generate_counter_argument_first_time(
        data.case_summary,
        data.similar_cases,
        data.ipc_sections_with_desc,
        data.evidence_types,
    )
    return {"result": result}

@router.post("/generate_counter_argument")
def api_generate_counter_argument(data: ArgumentRequest):
    result = generate_counter_argument(
        data.case_summary,
        data.similar_cases,
        data.ipc_sections_with_desc,
        data.evidence_types,
        data.previous_argument,
    )
    return {"result": result}

@router.post("/generate_user_prompt_properly")
def api_generate_user_prompt_properly(data: UserPromptRequest):
    result = generate_user_prompt_properly(data.user_prompt)
    return {"result": result}

@router.post("/generate_evidence_for_section")
def api_generate_evidence_for_section(data: EvidenceRequest):
    result = generate_evidence_for_section(data.ipc_section)
    return {"result": result}

@router.post("/generate_ipc_section")
def api_generate_ipc_section(data: IPCSectionRequest):
    result = generate_ipc_section(data.user_prompt)
    return {"result": result}

@router.post("/get_similar_cases_for_section")
def api_get_similar_cases_for_section(data: SimilarCasesRequest):
    result = get_similar_cases_for_section(data.ipc_section)
    return {"result": result}

@router.post("/get_summary")
def api_get_summary(data: SummaryRequest):
    result = get_summary(data.information)
    return {"result": result}

@router.get("/")
def api_get_summary():
    return {"result": "backend is working"}


