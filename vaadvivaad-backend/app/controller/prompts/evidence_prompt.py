

def draft_evidence_prompt(user_case_description):

    prompt = f"""
You are a legal expert assistant. A user has described a situation in layman's language. 
Your tasks are:

1. Analyze the case and identify the relevant sections of the Indian Penal Code (IPC).
2. For each applicable section, provide:
   - The crime type
   - IPC section number
   - Typical evidence collected in such cases
   - Categories of evidence commonly presented in court

Respond strictly in the following JSON format for each identified section:

{{
  "crime_type": "string",            // e.g., "Murder"
  "ipc_section": "string",           // e.g., "302"
  "typical_evidence": [              // Common evidence types
    "string"
  ],
  "evidence_category_tags": [        // Broad categories of evidence
    "string"
  ]
}}

IMPORTANT:
- Do NOT include any text, explanation, or commentary outside the JSON.
- Only return an array of valid JSON objects, one for each applicable IPC section.

Here is the user-described case:
\"\"\"
{user_case_description}
\"\"\"
"""
    return prompt
