def draft_similar_cases_prompt(ipc_section: str) -> str:
    prompt = f"""
You are an expert legal research assistant specialized in Indian criminal law.  
Your task is to provide a JSON array containing exactly 3 **real** and **verifiable** court cases related to the IPC section "{ipc_section}".

For each case, include the following fields with accurate and concise information based on actual case law:

[
  {{
    "case_id_name": "Official case name or citation string (e.g., 'State vs Ram Kumar')",
    "ipc_sections": ["List of IPC sections relevant to the case, including '{ipc_section}'"],
    "court": "Full name of the court where the case was adjudicated",
    "date_of_judgment": "Date of judgment in ISO format YYYY-MM-DD (use empty string if unknown)",
    "case_summary": "Brief factual summary describing the case background and legal context",
    "legal_issues": ["List key legal issues or questions addressed"],
    "judgment_text": "Concise excerpt or paraphrase of the judgment focusing on rationale or key findings",
    "verdict_outcome": "Final court decision (e.g., 'Convicted', 'Acquitted', 'Dismissed')",
    "key_precedents_cited": ["List important precedents or landmark cases cited"],
    "defense_raised": ["Summarize defenses raised by the accused or appellant"],
    "evidence_discussed": ["List types or key pieces of evidence discussed in the judgment"],
    "crime_type": "General classification of crime (e.g., 'Murder', 'Attempted Murder')",
    "severity": "Severity classification (e.g., 'Serious', 'Moderate', 'Minor')"
  }},
  ...
]

Guidelines and edge cases:
- Provide only **real cases** reported in Indian courts. Avoid hypothetical or fictional cases.
- If any specific field data is unavailable or not mentioned in the judgment, use an empty string ("") for text fields or an empty array ([]) for lists.
- The "ipc_sections" field must at minimum include the input "{ipc_section}".
- Dates must strictly follow the YYYY-MM-DD format or be empty if unknown.
- The JSON must be syntactically valid and parsable.
- Do not include any explanations, commentary, or text outside the JSON array.
- Focus on clarity and accuracy but keep the entries concise.
- Use appropriate Indian legal terminology.

Return only the JSON array.
"""
    return prompt.strip()
