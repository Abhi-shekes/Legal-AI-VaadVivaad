from fastapi import APIRouter, HTTPException
from typing import List, Dict
from pydantic import BaseModel
import time

from app.controller.vectordbcontroller.find_similar_case import find_similar_cases
from app.controller.geminiController.DRAFT_USER_INPUT_MAIN import generate_user_prompt_properly
from app.controller.geminiController.COUNTER_ARGUMENT_MAIN import generate_counter_argument
from app.controller.geminiController.IPC_SECTION_MAIN import generate_ipc_section, generate_ipc_section_desc
from app.controller.geminiController.SIMILAR_CASES_MAIN import get_similar_cases_for_section
from app.controller.geminiController.EVIDENCE_MAIN import generate_evidence_for_section
from app.controller.geminiController.ARGUMENT_MAIN import generate_argument, generate_argument_first_time

router = APIRouter()

class CaseRequest(BaseModel):
    incident_description: str
    evidence: str

@router.post("/start-case", response_model=Dict)
def start_case_flow(case_request: CaseRequest):
    try:
        # Step 1: Generate prompt
        processed_prompt = generate_user_prompt_properly(case_request.incident_description)
        print("\n--- Processed Prompt ---")
        print(processed_prompt)
        print("\n--- Processed Prompt ---")

        # Step 2: Find similar cases
        case_laws_resp = find_similar_cases(processed_prompt)
        print("\n--- Similar Cases Response ---")
        print(case_laws_resp)
        print("\n--- - - - - - -  ---")

        if case_laws_resp == []:
            ## Step 3.1 : Fetch the IPC Section from the prompt 
            ipc_section = generate_ipc_section(processed_prompt)

            ## Step 3.2 : Fecleatch the Similar Case from the fetched IPC Section
            similar_case = get_similar_cases_for_section(ipc_section[0])

            ## Step 3.3 : Fetch the IPC Section Details from the fetched IPC Section 
            ipc_section_detail = generate_ipc_section_desc(ipc_section[0])

            ## Step 3.4 : Fetch the IPC Section Evidence from the fetched IPC Section 
            ipc_section_evidence = generate_evidence_for_section(ipc_section[0])

        else:
            ## Same Logic to fetch from Astra DB same ipc section , evidence and similar case 
            print("I am in the else ")
            # You'll need to implement this part based on your data structure
            ipc_section = [case_laws_resp[0].get("ipc_sections", [""])[0]]
            similar_case = [case_laws_resp[0].get("case_summary", "")]
            ipc_section_detail = case_laws_resp[0].get("legal_issues", "")
            ipc_section_evidence = [{"typical_evidence": case_laws_resp[0].get("evidence", "")}]

        print("\n==============================")
        print(f"📘 IPC Section Fetched:\n{ipc_section[0]}")
        print("==============================\n")

        print("🧑‍⚖️ Similar Case:\n")
        print(similar_case[0])
        print("\n==============================\n")

        print("📚 IPC Section Detail:\n")
        print(f"IPC Section Deatils :\n {ipc_section_detail}")
        print("\n==============================\n")

        print("🔍 IPC Section Evidence:\n")
        print(f"IPC Section Deatils :\n {ipc_section_evidence[0]['typical_evidence']}")
        print("\n==============================\n")

        ## Step 4 : Start with AI Agent for arguing 
        firstResponse = generate_argument_first_time(
            processed_prompt,
            similar_case[0],
            ipc_section_detail,
            ipc_section_evidence[0]['typical_evidence'],
        )

        print("\n🔍 Reply From AI Agent :\n")
        print(f"Supporting Argument :\n {firstResponse[0]}")
        print("\n==============================\n")

        ## Debate variables
        current_argument = firstResponse[0]
        debate_history = [{
            "role": "supporting",
            "argument": current_argument,
            "round": 0
        }]

        ## Step 5 :- Debate loop for 10 rounds
        for round_num in range(1, 11):
            time.sleep(1)  # Small delay for readability
            
            # Opposition lawyer responds
            print(f"\n⚖️ ROUND {round_num} - OPPOSITION RESPONSE:\n")
            counter_response = generate_counter_argument(
                processed_prompt,
                similar_case[0],
                ipc_section_detail,
                ipc_section_evidence[0]['typical_evidence'],
                current_argument,
            )
            print(f"Opposition Argument:\n {counter_response[0]}")
            print("\n------------------------------\n")
            debate_history.append({
                "role": "opposition",
                "argument": counter_response[0],
                "round": round_num
            })

            time.sleep(1)
            
            # Supporting lawyer rebuts
            print(f"\n⚖️ ROUND {round_num} - SUPPORTING REBUTTAL:\n")
            current_argument = generate_argument(
                processed_prompt,
                similar_case[0],
                ipc_section_detail,
                ipc_section_evidence[0]['typical_evidence'],
                counter_response[0],
            )
            print(f"Supporting Rebuttal:\n {current_argument[0]}")
            print("\n==============================\n")
            debate_history.append({
                "role": "supporting",
                "argument": current_argument[0],
                "round": round_num
            })

        print("\n🏁 DEBATE CONCLUDED AFTER 10 ROUNDS\n")

        return {
            "status": "success",
            "processed_prompt": processed_prompt,
            "similar_cases": case_laws_resp,
            "ipc_section": ipc_section[0],
            "similar_case": similar_case[0],
            "debate_history": debate_history,
            "total_rounds": 10
        }

    except Exception as e:
        print(f"\n❌ Error: {str(e)}\n")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")