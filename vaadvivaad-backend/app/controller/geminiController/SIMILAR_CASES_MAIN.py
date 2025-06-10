
from app.controller.prompts.similar_cases_prompt import draft_similar_cases_prompt
from app.core.model_config import GENERATE_INFORMATION_OF_CASE


def get_similar_cases_for_section(ipc_section: str):
  
    return GENERATE_INFORMATION_OF_CASE(ipc_section, draft_similar_cases_prompt)
