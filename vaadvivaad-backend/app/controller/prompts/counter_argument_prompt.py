
import json
from typing import List, Dict


def draft_prompt_for_counter_argument(
    case_summary: str,
    similar_cases: List[Dict],
    ipc_sections_with_desc: List[Dict],
    evidence_types: List[Dict],
    original_arguments: List[Dict]
) -> str:
    
    prompt = f"""
You are a senior legal strategist acting as a prosecutor or evaluator in an Indian criminal case.

Below is the full legal context.

CASE SUMMARY:
{case_summary}

SIMILAR PREVIOUS CASES:
{json.dumps(similar_cases)}

IPC SECTIONS AND DESCRIPTIONS:
{json.dumps(ipc_sections_with_desc)}

TYPICAL EVIDENCE BY CRIME TYPE:
{json.dumps(evidence_types)}

ORIGINAL DEFENSE ARGUMENTS:
{json.dumps(original_arguments)}

TASK:

For each defense argument above, generate a rebuttal that includes:

- title: A brief summary of the counter-argument and be precise and short 
- argument: A detailed refutation of the defense's logic, legality, or evidence and be precise and short 
- follow_up_questions: Questions to expose ambiguity or inconsistency and be precise and short 
- evidence_or_proof_requests: What the defense must prove clearly and be precise and short 
- observations_or_loopholes: Weaknesses in defense logic or legal references and be precise and short 

The output must be a pure JSON list of counter-arguments.

RETURN FORMAT:

[
  {{
    "title": "string",
    "argument": "Full counter-argument text",
    "follow_up_questions": ["string", "..."],
    "evidence_or_proof_requests": ["string", "..."],
    "observations_or_loopholes": ["string", "..."]
  }},
  ...
]

⚠️ Return only valid JSON. Do NOT include any explanation, markdown, or extra text.
""".strip()

    return prompt


def generate_counter_argument_prompt_no_original(
    case_summary: str,
    similar_cases: List[Dict],
    ipc_sections_with_desc: List[Dict],
    evidence_types: List[Dict],
    original_arguments: List[Dict]
) -> str:


    prompt = f"""
You are a legal strategist or prosecutor in an Indian criminal case.

Here is the legal context:

CASE SUMMARY:
{case_summary}

SIMILAR PREVIOUS CASES:
{json.dumps(similar_cases)}

IPC SECTIONS AND DESCRIPTIONS:
{json.dumps(ipc_sections_with_desc)}

TYPICAL EVIDENCE BY CRIME TYPE:
{json.dumps(evidence_types)}

TASK:

Generate exactly 2 strong counter-arguments that anticipate and challenge potential defense claims.

Each counter-argument must include:
- title: A short heading
- argument: A detailed, well-reasoned explanation and be precise and short
- follow_up_questions: Critical questions for exposing flaws and be precise and short
- evidence_or_proof_requests: What evidence to demand from the defense and be precise and short
- observations_or_loopholes: Weaknesses in common defense strategies and be precise and short 

OUTPUT FORMAT (STRICTLY JSON):

[
  {{
    "title": "string",
    "argument": "Full detailed counter-argument text",
    "follow_up_questions": ["string", "..."],
    "evidence_or_proof_requests": ["string", "..."],
    "observations_or_loopholes": ["string", "..."]
  }},
  {{
    "title": "string",
    "argument": "Full detailed counter-argument text",
    "follow_up_questions": ["string", "..."],
    "evidence_or_proof_requests": ["string", "..."],
    "observations_or_loopholes": ["string", "..."]
  }}
]

⚠️ Return only valid JSON. Do NOT include markdown, titles, or any extra explanation.
""".strip()

    return prompt
