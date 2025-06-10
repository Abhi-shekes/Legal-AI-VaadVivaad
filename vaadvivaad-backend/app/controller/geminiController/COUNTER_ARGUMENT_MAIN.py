from app.controller.prompts.counter_argument_prompt import generate_continue_opposing_prompt, generate_opposing_plaintiff_prompt
from app.core.model_config import START_ARGUING


def generate_counter_argument_first_time(case_summary, similar_cases,ipc_sections_with_desc,evidence_types ):
    return START_ARGUING(case_summary, similar_cases,ipc_sections_with_desc,evidence_types,None,generate_opposing_plaintiff_prompt)


def generate_counter_argument(case_summary, similar_cases,ipc_sections_with_desc,evidence_types,  previous_argument ):
    return START_ARGUING(case_summary, similar_cases,ipc_sections_with_desc,evidence_types,  previous_argument , generate_continue_opposing_prompt)
