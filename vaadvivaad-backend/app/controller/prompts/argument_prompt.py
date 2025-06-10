
import json
from typing import List, Dict

def draft_prompt_for_argument(
    case_summary: str,
    similar_cases: List[Dict],
    ipc_sections_with_desc: List[Dict],
    evidence_types: List[Dict],
    counter_arguments: List[Dict]
) -> str:
   
    prompt = f"""
You are a senior legal strategist specializing in Indian criminal law.

Use the context below to draft **two high-quality defense arguments**.

--- CASE SUMMARY ---
{case_summary}

--- SIMILAR CASES ---
{json.dumps(similar_cases)}

--- IPC SECTIONS & DESCRIPTIONS ---
{json.dumps(ipc_sections_with_desc)}

--- TYPICAL EVIDENCE PER IPC SECTION ---
{json.dumps(evidence_types)}

--- TASK ---

Generate exactly two legal defense arguments in the following format  and be precise and short :
- Title
- Main Argument
- Follow-Up Questions (for challenging the prosecution)
- Requests for Specific Evidence
- Observations or Legal Loopholes

### RETURN FORMAT (STRICTLY JSON)

Return only the following JSON array — with no explanations or markdown:

[
  {{
    "title": "string",
    "argument": "string",
    "follow_up_questions": ["string", "..."],
    "evidence_or_proof_requests": ["string", "..."],
    "observations_or_loopholes": ["string", "..."]
  }},
  {{
    "title": "string",
    "argument": "string",
    "follow_up_questions": ["string", "..."],
    "evidence_or_proof_requests": ["string", "..."],
    "observations_or_loopholes": ["string", "..."]
  }}
]

⚠️ Return only valid JSON — no extra text, no headers, no markdown.
""".strip()

    return prompt


def generate_supporting_argument_with_counter_prompt(
    case_summary: str,
    similar_cases: List[Dict],
    ipc_sections_with_desc: List[Dict],
    evidence_types: List[Dict],
    counter_arguments: List[Dict]
) -> str:
    

    prompt = f"""
You are a senior defense legal strategist in an Indian criminal trial.

Below is the case context and the prosecution's counter-arguments to the initial defense.

--- CASE SUMMARY ---
{case_summary}

--- SIMILAR CASES ---
{json.dumps(similar_cases)}

--- IPC SECTIONS & DESCRIPTIONS ---
{json.dumps(ipc_sections_with_desc)}

--- TYPICAL EVIDENCE TYPES ---
{json.dumps(evidence_types)}

--- PROSECUTION'S COUNTER-ARGUMENTS ---
{json.dumps(counter_arguments)}

--- TASK ---

For each counter-argument, generate a **refined supporting argument** in favor of the defense.

### REQUIRED FIELDS (PER ARGUMENT):

- Title
- Argument
- Follow-Up Questions
- Evidence or Proof Requests
- Observations or Loopholes

### RETURN FORMAT (STRICTLY JSON)

Return a JSON array like:

[
  {{
    "title": "string",
    "argument": "string",
    "follow_up_questions": ["string", "..."],
    "evidence_or_proof_requests": ["string", "..."],
    "observations_or_loopholes": ["string", "..."]
  }},
  ...
]

⚠️ Return only valid JSON with no additional commentary or formatting.
""".strip()

    return prompt
