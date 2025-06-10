# schemas/legal_gen.py
from pydantic import BaseModel
from typing import List, Dict, Optional

class ArgumentRequestFirstTime(BaseModel):
    case_summary: str
    similar_cases: List[Dict]
    ipc_sections_with_desc: List[Dict]
    evidence_types: List[str]

class ArgumentRequest(ArgumentRequestFirstTime):
    previous_argument: str

class UserPromptRequest(BaseModel):
    user_prompt: str

class IPCSectionRequest(BaseModel):
    user_prompt: str

class IPCSectionDescRequest(BaseModel):
    ipc_section: str

class EvidenceRequest(BaseModel):
    ipc_section: str

class SimilarCasesRequest(BaseModel):
    ipc_section: str

class SummaryRequest(BaseModel):
    information: str
