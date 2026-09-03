
from app.controller.prompts.evidence_prompt import draft_evidence_prompt
from app.core.model_config import GENERATE_INFORMATION_OF_CASE
from app.utils.saveIPCEvidence import saveIPCEvidence


def generate_evidence_for_section(ipc_section: str):

    evidence = GENERATE_INFORMATION_OF_CASE(ipc_section, draft_evidence_prompt)

    if evidence and len(evidence) > 0:
        saveIPCEvidence(evidence[0])

    # saveIPCEvidence(evidence[0] if len(evidence) > 0 else evidence)
    return evidence
   