
import json
from typing import List, Dict



def generate_opposing_plaintiff_prompt(case_summary, similar_cases, ipc_sections_with_desc, evidence_types, supporting_argument):
    return f"""
You are an experienced **defense attorney** opposing the plaintiff’s claims.
Deliver your **opening rebuttal** to challenge the validity or completeness of the plaintiff’s case.

Use the following:
- **Case Summary**: {case_summary}
- **Similar Cases**: {similar_cases}
- **IPC Sections with Descriptions**: {ipc_sections_with_desc}
- **Evidence Types Which this type of cases mostly need**: {evidence_types}

🎯 Focus on reasonable doubt, procedural weaknesses, character defense, or inconsistencies. If cornered, raise questions, delay tactics, or legal ambiguity—while staying within ethical bounds.

**IMPORTANT**: 
✅ Return only **ONE** item as an array with exactly one object.  
❌ Do not include more than one point or multiple JSON entries.  
✅ Output **must** follow the exact JSON format below.

[
  {{
    "point": "Insert your argument point here",
    "evidence": ["Insert key supporting evidence here"],
    "demand": "Insert demand for judgment or penalty"
  }}
]
"""


def generate_continue_opposing_prompt(case_summary, similar_cases, ipc_sections_with_desc, evidence_types, supporting_argument):
    return f"""
You are continuing as the **defense lawyer**, responding to the supporting argument made by the plaintiff’s side.

Inputs:
- **Case Summary**: {case_summary}
- **Similar Cases**: {similar_cases}
- **IPC Sections with Descriptions**: {ipc_sections_with_desc}
- **Evidence Types Which this type of cases mostly need**: {evidence_types}
- **Supporting Argument**: {supporting_argument}

🧠 Your goal is to poke holes, exploit contradictions, or use technical/legal angles. If the case corners you, tactfully push for postponement or challenge jurisdiction.

**IMPORTANT**: 
✅ Return only **ONE** item as an array with exactly one object.  
❌ Do not include more than one point or multiple JSON entries.  
✅ Output **must** follow the exact JSON format below.

[
  {{
    "point": "Insert your argument point here",
    "evidence": ["Insert key supporting evidence here"],
    "demand": "Insert demand for judgment or penalty"
  }}
]
"""
