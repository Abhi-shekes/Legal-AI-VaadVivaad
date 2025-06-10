
from app.controller.prompts.counter_argument_prompt import draft_prompt_for_counter_argument, generate_counter_argument_prompt_no_original
from app.core.model_config import START_ARGUING


def generate_counter_argument_first_time(case_summary, similar_cases,ipc_sections_with_desc,evidence_types ):
    return START_ARGUING(case_summary, similar_cases,ipc_sections_with_desc,evidence_types,None,generate_counter_argument_prompt_no_original)


def generate_counter_argument(case_summary, similar_cases,ipc_sections_with_desc,evidence_types,  previous_argument ):
    return START_ARGUING(case_summary, similar_cases,ipc_sections_with_desc,evidence_types,  previous_argument , draft_prompt_for_counter_argument)
