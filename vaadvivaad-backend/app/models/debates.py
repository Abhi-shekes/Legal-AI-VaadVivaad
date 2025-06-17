from pydantic import BaseModel, Field
from typing import List, Dict, Union, Optional
from uuid import UUID
from datetime import datetime

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

class DebateInDB(BaseModel):
    debate_id: UUID = Field(..., description="Unique UUID for the debate")
    user_id: UUID = Field(..., description="Reference to the user's UUID in the users collection")
    ipc_section: Optional[str] = Field(None, description="IPC section code, e.g., '376'")
    similar_case: Optional[SimilarCase] = Field(None, description="Details of a similar case")
    debate_history: List[DebateHistoryEntry] = Field(..., description="List of debate arguments")
    status: str = Field(default="completed", description="Debate status, e.g., 'completed', 'in_progress'")
    

    