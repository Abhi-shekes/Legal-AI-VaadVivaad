from fastapi import APIRouter
from pydantic import BaseModel
from app.controller.geminiController.generate_user_prompt import generate_user_prompt

class UserPromptRequest(BaseModel):
    user_prompt: str

router = APIRouter()

@router.post("/generate_user_prompt_properly")
def generate_user_prompt_endpoint(data: UserPromptRequest):
    result = generate_user_prompt(data.user_prompt)
    return result
