

from app.controller.prompts.user_input_prompt import draft_legal_refinement_prompt
from app.core.model_config import GENERATE_INFORMATION_OF_CASE


def generate_user_prompt_properly(user_prompt: str):
    return GENERATE_INFORMATION_OF_CASE(user_prompt, draft_legal_refinement_prompt)

   