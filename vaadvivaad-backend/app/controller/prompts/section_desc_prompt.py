def draft_section_desc_prompt(ipc_section: str) -> str:
    prompt = f"""
You are a legal research assistant trained in Indian criminal law.

Your task is to return a **strictly formatted JSON object** describing IPC Section "{ipc_section}" based on real statutory and judicial interpretation. Your output must match this exact structure:

{{
  "section": "Section number only, e.g., '302'",
  "code": "Full section title from IPC, e.g., 'Section 302 - Punishment for murder'",
  "status": {{
    "current": "Active | Repealed | Amended",
    "description": "Explanation of current status and whether it has been amended, repealed, or remains active"
  }},
  "elements_of_offense": {{
    "definition": "Legal definition in plain terms",
    "essential_elements": [
      {{
        "element": "Brief title of element",
        "description": "Detailed explanation of that element"
      }}
    ],
    "mens_rea": "State of mind or intent required",
    "proof_requirement": "What must be proven beyond reasonable doubt"
  }},
  "typical_punishments": {{
    "description": "General overview of punishments for this section",
    "punishments": [
      {{
        "type": "e.g., Imprisonment for life, Fine, Death Penalty",
        "description": "Explanation of this punishment type",
        "conditions": "Conditions under which this punishment may apply",
        "example_cases": ["List real case names/citations where this was applied"]
      }}
    ],
    "sentencing_considerations": {{
      "aggravating_factors": ["List of factors increasing punishment"],
      "mitigating_factors": ["List of factors reducing punishment"]
    }}
  }},
  "exceptions_or_defenses": {{
    "description": "Overview of available legal exceptions or defenses",
    "exceptions": [
      {{
        "exception": "Title of exception",
        "description": "Explanation",
        "conditions": "Conditions required",
        "outcome": "How it affects liability"
      }}
    ],
    "defenses": [
      {{
        "defense": "Name of defense (e.g., insanity, self-defense)",
        "description": "Brief explanation",
        "conditions": "Legal conditions required"
      }}
    ],
    "burden_of_proof": "Who must prove the defense (e.g., Prosecution or Accused)"
  }},
  "procedural_steps": {{
    "description": "Overview of how the offense is processed procedurally",
    "steps": [
      {{
        "step": "Step name (e.g., FIR, Charge Sheet, Trial)",
        "description": "Brief explanation",
        "details": "string or array describing what this step includes"
      }}
    ],
    "nature_of_offense": {{
      "cognizable": true | false,
      "bailable": true | false,
      "compoundable": true | false,
      "court": "e.g., Sessions Court, Magistrate First Class"
    }},
    "special_considerations": [
      {{
        "group": "If applicable (e.g., Juvenile, Women)",
        "provision": "Special provision reference or explanation"
      }}
    ]
  }},
  "landmark_cases": [
    {{
      "case": "Name or citation of a real Indian court case",
      "significance": "Brief on why it is important for this section"
    }}
  ],
  "legal_framework": {{
    "enactment": "Original year of enactment",
    "amendments": "Summary of important amendments (or 'None')",
    "related_sections": [
      {{
        "section": "IPC section number",
        "description": "Short reason it's related"
      }}
    ]
  }},
  "challenges": [
    {{
      "challenge": "Brief title of issue",
      "description": "Explanation of legal or practical challenges associated with enforcing this section"
    }}
  ]
}}

### IMPORTANT INSTRUCTIONS:
- Your response must contain ONLY valid JSON.
- Do **not** include markdown formatting (` ```json ` or otherwise).
- All information must be based on **real legal interpretation and judicial data**. No hallucinations or fictional examples.
- Use empty strings "" or empty arrays [] for fields where no data is available.
- Use `true`/`false` for boolean fields (not capitalized strings).
- Dates must be in YYYY format where required.
- All entries must be legally plausible, relevant, and precise.

Return only the JSON.
"""
    return prompt.strip()






def generate_ipc_section_from_prompt(user_input):
    prompt = f"""
You are a legal assistant specialized in Indian criminal law.

Your task:
- Read the user’s layman-language case.
- Identify relevant Indian Penal Code (IPC) sections.
- Return **only a JSON array** of applicable IPC sections — no extra explanation.

Example:
User Description: "Someone stole my mobile phone at the railway station."
Output: ["Section 379"]

Now do the same for:
User Description: "{user_input}"

Output:
""".strip()

    return prompt
