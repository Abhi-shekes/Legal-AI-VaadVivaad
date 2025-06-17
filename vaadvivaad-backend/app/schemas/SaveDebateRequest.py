
from pydantic import BaseModel, Field
from typing import List, Union, Optional


class SimilarCase(BaseModel):
    case_id_name: str = Field(..., description="Name or ID of the case, e.g., 'State vs. John Doe'")
    court: Optional[str] = Field(None, description="Court where the case was judged, e.g., 'Supreme Court'")
    date_of_judgment: Optional[str] = Field(None, description="Date of judgment, e.g., '2023-05-15'")
    case_summary: Optional[str] = Field(None, description="Summary of the case")

class Argument(BaseModel):
    point: Optional[str] = Field(None, description="Main point of the argument")
    evidence: Optional[List[str]] = Field(None, description="List of evidence supporting the argument")
    demand: Optional[str] = Field(None, description="Legal demand made in the argument")

class DebateHistoryEntry(BaseModel):
    role: str = Field(..., description="Role of the argument, either 'supporting' or 'opposing'")
    argument: Union[Argument, str] = Field(..., description="Argument content, either a string or structured object")
    round: int = Field(..., ge=0, description="Debate round number, 0-based")

class SaveDebateRequest(BaseModel):
    debate_history: List[DebateHistoryEntry]
    ipc_section: str
    similar_case: SimilarCase  # Use SimilarCase model instead of Dict
    user_id: str  # Added to match DebateInDB