def create_legal_summary_prompt(information: str) -> str:
    prompt = f"""
You are a legal expert assistant.

Below is a case situation described in informal or layman's language.

CASE INPUT:
{information}

TASK:
Summarize this situation in clear, formal legal language. Focus on key facts, nature of the crime, and legal implications.

OUTPUT FORMAT:
Respond ONLY with a JSON object with one key "summary", like this:

{{ 
  "summary": "Your concise legal summary here."
}}

Do NOT include any extra text or formatting.
""".strip()

    return prompt
