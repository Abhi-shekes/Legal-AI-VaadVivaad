
from app.controller.prompts.summary_prompt import create_legal_summary_prompt
from app.core.model_config import GENERATE_INFORMATION_OF_CASE


def get_summary(information: str):
    return GENERATE_INFORMATION_OF_CASE(information, create_legal_summary_prompt)
