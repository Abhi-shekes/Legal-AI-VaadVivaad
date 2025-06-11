from app.controller.prompts.section_desc_prompt import draft_section_desc_prompt, generate_ipc_section_from_prompt
from app.core.model_config import GENERATE_INFORMATION_OF_CASE
from app.utils.saveIPCSection import saveIPCSection


def generate_ipc_section(user_prompt:str):
    return GENERATE_INFORMATION_OF_CASE(user_prompt, generate_ipc_section_from_prompt)

def generate_ipc_section_desc(ipc_section: str):
    ipc_section = GENERATE_INFORMATION_OF_CASE(ipc_section, draft_section_desc_prompt)
    saveIPCSection(ipc_section)
    return ipc_section



