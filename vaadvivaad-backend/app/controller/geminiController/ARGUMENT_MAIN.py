


from app.controller.prompts.argument_prompt import draft_prompt_for_argument, generate_supporting_argument_with_counter_prompt
from app.core.model_config import START_ARGUING


def generate_argument_first_time(case_summary, similar_cases,ipc_sections_with_desc,evidence_types ):
    return START_ARGUING(case_summary, similar_cases,ipc_sections_with_desc,evidence_types, None, draft_prompt_for_argument)


def generate_argument(case_summary, similar_cases,ipc_sections_with_desc,evidence_types,  previous_argument ):
    return START_ARGUING(case_summary, similar_cases,ipc_sections_with_desc,evidence_types,  previous_argument , generate_supporting_argument_with_counter_prompt)
