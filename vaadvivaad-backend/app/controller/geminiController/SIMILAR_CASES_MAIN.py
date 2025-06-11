
from app.controller.prompts.similar_cases_prompt import draft_similar_cases_prompt
from app.core.model_config import GENERATE_INFORMATION_OF_CASE
from app.utils.saveSimilarCases import saveSimilarCases

def get_similar_cases_for_section(ipc_section: str):
  
    case = GENERATE_INFORMATION_OF_CASE(ipc_section, draft_similar_cases_prompt)

    ## Save the Generated JSON To the Astra Db 
    saveSimilarCases(case[0])
    return case
  
