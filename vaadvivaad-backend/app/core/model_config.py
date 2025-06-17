from dotenv import load_dotenv, dotenv_values
import google.generativeai as genai
import json
from typing import Callable, Union
from typing import List, Dict, Optional

load_dotenv()
env_vars = dotenv_values()
GOOGLE_API_KEY = env_vars.get("GOOGLE_API_KEY")
genai.configure(api_key=GOOGLE_API_KEY)



def GENERATE_RESPONSE_FROM_GEMINI(prompt):
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content(prompt)
        raw_text = response.text.strip()
    except Exception as e:
        print(f"Error generating content from Gemini: {e}")
        return None

    if not raw_text:
        print("Error: Empty response from Gemini")
        return None

    # Strip code block markers if present
    cleaned_text = raw_text
    if raw_text.startswith("```") and raw_text.endswith("```"):
        lines = raw_text.splitlines()
        # Remove the first line if it starts with ```
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        # Remove the last line if it is ```
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned_text = "\n".join(lines).strip()
    
    if not cleaned_text:
        print("Error: Cleaned text is empty after processing")
        return None

    try:
        parsed_json = json.loads(cleaned_text)
        return parsed_json
    except json.JSONDecodeError as e:
        print(f"Failed to parse JSON from Gemini response: {e}")
        print(f"Problematic text: {cleaned_text}")
        return None





def GENERATE_INFORMATION_OF_CASE(
    input_data: Union[str, dict],
    prompt_fn: Callable[[Union[str, dict]], str]
):
    
    try:
        prompt = prompt_fn(input_data)
    except Exception as e:
        print("Error generating prompt:", e)
        return None

    return GENERATE_RESPONSE_FROM_GEMINI(prompt)







def START_ARGUING(
    case_summary: str,
    similar_cases: List[Dict],
    ipc_sections_with_desc: List[Dict],
    evidence_types: List[Dict],
    previous_argument: Optional[List[Dict]] = None,
    draft_prompt_fn: Optional[Callable[[Dict], str]] = None,
) -> Optional[List[Dict]]:


    prompt = draft_prompt_fn(case_summary,similar_cases, ipc_sections_with_desc, evidence_types, previous_argument)


    return GENERATE_RESPONSE_FROM_GEMINI(prompt)




