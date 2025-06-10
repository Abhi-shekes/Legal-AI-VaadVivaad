import json
from typing import List, Dict


def draft_prompt_for_argument(
    case_summary: str,
    similar_cases: List[Dict],
    ipc_sections_with_desc: List[Dict],
    evidence_types: List[Dict],
    defense_arguments: List[Dict]
) -> str:
   
    prompt = f"""
You are a senior legal strategist representing the plaintiff in an Indian criminal case.

Use the context below to draft **exactly two strong prosecution arguments** supporting the charges.

--- CASE SUMMARY ---
{case_summary}

--- SIMILAR CASES ---
{json.dumps(similar_cases)}

--- IPC SECTIONS & DESCRIPTIONS ---
{json.dumps(ipc_sections_with_desc)}

--- TYPICAL EVIDENCE PER IPC SECTION ---
{json.dumps(evidence_types)}

--- KNOWN DEFENSE ARGUMENTS ---
{json.dumps(defense_arguments)}

--- TASK ---

Generate exactly two legal arguments for the **plaintiff/prosecution** in the format below. Each argument must include:
- A concise title
- A strong legal argument
- Exactly 2 follow-up questions
- Exactly 2 requests for specific evidence
- Exactly 2 observations or legal points

### STRICT RETURN FORMAT — VALID JSON ARRAY ONLY

[
  {{
    "title": "string",
    "argument": "string",
    "follow_up_questions": ["string", "string"],
    "evidence_or_proof_requests": ["string", "string"],
    "observations_or_legal_points": ["string", "string"]
  }},
  {{
    "title": "string",
    "argument": "string",
    "follow_up_questions": ["string", "string"],
    "evidence_or_proof_requests": ["string", "string"],
    "observations_or_legal_points": ["string", "string"]
  }}
]

⚠️ Output must be exactly the above format — no extra text, no markdown, no explanations.
""".strip()

    return prompt



def generate_supporting_argument_with_counter_prompt(
    case_summary: str,
    similar_cases: List[Dict],
    ipc_sections_with_desc: List[Dict],
    evidence_types: List[Dict],
    defense_arguments: List[Dict]
) -> str:
    
    prompt = f"""
You are a senior legal strategist for the **plaintiff/prosecution** in an Indian criminal trial.

Below is the case context and the **defense's counter-arguments** to the charges.

--- CASE SUMMARY ---
{case_summary}

--- SIMILAR CASES ---
{json.dumps(similar_cases)}

--- IPC SECTIONS & DESCRIPTIONS ---
{json.dumps(ipc_sections_with_desc)}

--- TYPICAL EVIDENCE TYPES ---
{json.dumps(evidence_types)}

--- DEFENSE COUNTER-ARGUMENTS ---
{json.dumps(defense_arguments)}

--- TASK ---

From the arguments above, choose any two of the **most critical defense arguments** and generate a **rebuttal for each** from the plaintiff's perspective.

Each rebuttal must include:
- A concise title
- A strong argument
- Exactly 2 follow-up questions
- Exactly 2 evidence or proof requests
- Exactly 2 legal points or observations that weaken the defense

### STRICT RETURN FORMAT — VALID JSON ARRAY ONLY

[
  {{
    "title": "string",
    "argument": "string",
    "follow_up_questions": ["string", "string"],
    "evidence_or_proof_requests": ["string", "string"],
    "observations_or_legal_points": ["string", "string"]
  }},
  {{
    "title": "string",
    "argument": "string",
    "follow_up_questions": ["string", "string"],
    "evidence_or_proof_requests": ["string", "string"],
    "observations_or_legal_points": ["string", "string"]
  }}
]

⚠️ Output must be exactly the above format — no extra text, no markdown, no explanations.
""".strip()

    return prompt



