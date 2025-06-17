from typing import Optional, List, Dict
from pydantic import BaseModel

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