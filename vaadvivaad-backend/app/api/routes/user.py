from fastapi import APIRouter, HTTPException, Depends ,Request
from pydantic import BaseModel
from typing import List, Dict
from app.db.mongodb import db
import time
import re
import traceback
from motor.motor_asyncio import AsyncIOMotorClient


from uuid import uuid4, UUID
from pymongo import MongoClient
from datetime import datetime



# --- Controller Imports ---
from app.controller.vectordbcontroller.find_similar_case import find_similar_cases
from app.controller.vectordbcontroller.search_by_ipc_section import search_by_ipc_section
from app.controller.vectordbcontroller.search_ipc_evidence import search_evidence_by_ipc_section
from app.controller.geminiController.DRAFT_USER_INPUT_MAIN import generate_user_prompt_properly
from app.controller.geminiController.COUNTER_ARGUMENT_MAIN import generate_counter_argument
from app.controller.geminiController.IPC_SECTION_MAIN import generate_ipc_section, generate_ipc_section_desc
from app.controller.geminiController.SIMILAR_CASES_MAIN import get_similar_cases_for_section
from app.controller.geminiController.EVIDENCE_MAIN import generate_evidence_for_section
from app.controller.geminiController.ARGUMENT_MAIN import generate_argument, generate_argument_first_time
from app.utils.is_logged_in import is_logged_in

# -- Schema Import 
from app.schemas.SaveDebateRequest import SaveDebateRequest

# --- Import the central 'sio' instance from main.py ---
from app.main import sio

router = APIRouter()

# --- A temporary store for case data received via HTTP ---
case_data_store = {}

class CaseRequest(BaseModel):
    incident_description: str
    evidence: str
    session_id: str

# --- Socket.IO Event Handlers ---

@sio.event
async def connect(sid, environ):
    print(f"✅ Client connected: {sid}")

@sio.event
async def disconnect(sid):
    # Clean up stored data when a client disconnects to prevent memory leaks
    sessions_to_remove = [s_id for s_id, client_sid in case_data_store.items() if client_sid.get('sid') == sid]
    for s_id in sessions_to_remove:
        del case_data_store[s_id]
        print(f"🧹 Cleaned up data for disconnected session: {s_id}")
    print(f"❌ Client disconnected: {sid}")

@sio.event
async def join_room(sid, data):
    session_id = data.get('session_id')
    if session_id:
        await sio.enter_room(sid, session_id)
        if session_id in case_data_store:
            case_data_store[session_id]['sid'] = sid
        print(f"✅ Client {sid} has joined room '{session_id}'")

# --- Helper Functions ---

async def send_to_ui(session_id: str, event: str, data: dict = None):
    # print(f"\n🚀 Emitting event '{event}' to room '{session_id}'")
    await sio.emit(event, data, room=session_id)

async def run_debate_flow(session_id: str):
    """The main debate logic, updated with new case processing."""
    try:
        if session_id not in case_data_store:
            raise ValueError("Case data not found for session.")

        case_request_data = case_data_store[session_id]
        incident_description = case_request_data['incident_description']

        print(f"--- Starting debate flow for SID: {session_id} ---")
        await send_to_ui(session_id, "case_status", {"message": "Debate started. Processing initial details..."})

        # Step 1: Generate prompt
        processed_prompt = generate_user_prompt_properly(incident_description)
        if processed_prompt.get("status") == "non-legal":
            await send_to_ui(session_id, "error", {"message": processed_prompt["message"]})
            await send_to_ui(session_id, "debate_failed")
            if session_id in case_data_store and 'sid' in case_data_store[session_id]:
                await sio.disconnect(case_data_store[session_id]['sid'])
            return
            

        # Step 2: Find similar cases
        await send_to_ui(session_id, "case_status", {"message": "Searching for similar cases..."})
        case_laws_resp = find_similar_cases(processed_prompt["crime_type"])

        # print("\n--- Similar Cases Response ---")
        # print(case_laws_resp)
        # print("\n--- - - - - - -  ---")

        if case_laws_resp == []:
            print("No similar cases found in DB, generating from Gemini...")
            # Step 3.1: Fetch the IPC Section from the prompt
            ipc_section = generate_ipc_section(processed_prompt)
            if not ipc_section or not isinstance(ipc_section, list) or len(ipc_section) == 0:
                raise ValueError("Failed to generate valid IPC section from prompt")

            # Step 3.2: Fetch the Similar Case from the fetched IPC Section
            similar_case = get_similar_cases_for_section(ipc_section[0])

            # Step 3.3: Fetch the IPC Section Details from the fetched IPC Section
            ipc_section_detail = generate_ipc_section_desc(ipc_section[0])

            # Step 3.4: Fetch the IPC Section Evidence from the fetched IPC Section
            ipc_section_evidence = generate_evidence_for_section(ipc_section[0])

        else:
            print("Found similar case, fetching from DB...")
            # Step 3.1: Fetch the IPC Section from the similar case
            ipc_section_normal = case_laws_resp[0]['case']['ipc_sections'][0]
            match = re.match(r'^(\d+)', ipc_section_normal)
            if match:
                ipc_section = [match.group(1)]
                print(ipc_section[0])
            else:
                raise ValueError(f"Could not extract IPC section number from: {ipc_section_normal}")

            # Step 3.2: Fetch the Similar Case from the fetched IPC Section
            similar_case = case_laws_resp

            # Step 3.3: Fetch the IPC Section Details from the fetched IPC Section
            ipc_section_detail = search_by_ipc_section(ipc_section[0])

            # Step 3.4: Fetch the IPC Section Evidence from the fetched IPC Section
            ipc_section_evidence = search_evidence_by_ipc_section(ipc_section[0])

        # print("\n==============================")
        # print(f"📘 IPC Section Fetched:\n{ipc_section[0]}")
        # print("==============================\n")

        # print("🧑‍⚖️ Similar Case:\n")
        # print(similar_case[0])
        # print("\n==============================\n")

        # print("📚 IPC Section Detail:\n")
        # print(f"IPC Section Details:\n {ipc_section_detail}")
        # print("\n==============================\n")

        # print("🔍 IPC Section Evidence:\n")
        # print(f"IPC Section Details:\n {ipc_section_evidence[0]['typical_evidence']}")
        # print("\n==============================\n")

        # Step 4: Start with AI Agent for arguing
        await send_to_ui(session_id, "case_status", {"message": "Generating initial argument..."})
        first_response = generate_argument_first_time(
            processed_prompt,
            similar_case[0],
            ipc_section_detail,
            ipc_section_evidence[0]['typical_evidence'],
        )

        # print("\n🔍 Reply From AI Agent:\n")
        # print(f"Supporting Argument:\n {first_response[0]}")
        # print("\n==============================\n")

        # Initialize debate history
        debate_history = [{
            "role": "supporting",
            "argument": first_response[0],
            "round": 0
        }]
        await send_to_ui(session_id, "new_argument", {
            "role": "supporting", "argument": first_response[0], "round": 0
        })

        # Step 5: Debate loop (1 round as per new code, but can be adjusted)
        current_argument = first_response[0]
        for round_num in range(1, 5):
            await send_to_ui(session_id, "typing", {"role": "opposing"})
            await sio.sleep(2)

            # print(f"\n⚖️ ROUND {round_num} - OPPOSITION RESPONSE:\n")

            counter_response = generate_counter_argument(
                processed_prompt,
                similar_case[0],
                ipc_section_detail,
                ipc_section_evidence[0]['typical_evidence'],
                current_argument,
            )

            # print(f"Opposition Argument:\n {counter_response[0]}")
            # print("\n------------------------------\n")


            debate_history.append({
                "role": "opposition",
                "argument": counter_response[0],
                "round": round_num
            })
            await send_to_ui(session_id, "new_argument", {
                "role": "opposing", "argument": counter_response[0], "round": round_num
            })

            await send_to_ui(session_id, "typing", {"role": "supporting"})
            await sio.sleep(2)

            # print(f"\n⚖️ ROUND {round_num} - SUPPORTING REBUTTAL:\n")

            rebuttal_response = generate_argument(
                processed_prompt,
                similar_case[0],
                ipc_section_detail,
                ipc_section_evidence[0]['typical_evidence'],
                counter_response[0],
            )
            current_argument = rebuttal_response[0]

            # print(f"Supporting Rebuttal:\n {current_argument[0]}")
            # print("\n==============================\n")

            debate_history.append({
                "role": "supporting",
                "argument": current_argument,
                "round": round_num
            })
            await send_to_ui(session_id, "new_argument", {
                "role": "supporting", "argument": current_argument, "round": round_num
            })

        #  print("\n🏁 DEBATE CONCLUDED AFTER 1 ROUND\n")
        await send_to_ui(session_id, "debate_concluded", {
            "total_rounds": 1,
            "debate_history": debate_history,
            "ipc_section": ipc_section[0],
            "similar_case": similar_case[0]
        })

    except Exception as e:
        print(f"Error in debate flow for {session_id}: {e}")
        traceback.print_exc()
        await send_to_ui(session_id, "error", {"message": f"An unexpected server error occurred: {str(e)}"})
    finally:
        # Clean up data after the flow is complete
        if session_id in case_data_store:
            del case_data_store[session_id]

# --- NEW Event handler to trigger the debate ---
@sio.on('start_debate_flow')
async def handle_start_debate(sid, data):
    session_id = data.get('session_id')
    if session_id and session_id in case_data_store:
        # Run the debate logic as a background task
        sio.start_background_task(run_debate_flow, session_id)
    else:
        print(f"⚠️ Could not start debate for SID {sid}. No data found for session: {session_id}")
        await sio.emit('error', {'message': 'Could not start debate. Session data not found. Please try again.'}, to=sid)

# --- HTTP Endpoint ---
@router.post("/start-case")
async def start_case_flow(case_request: CaseRequest):
    """Receives case data, stores it, and tells the client to connect."""
    print(f"Received case data for session: {case_request.session_id}")
    case_data_store[case_request.session_id] = {
        "incident_description": case_request.incident_description,
        "evidence": case_request.evidence
    }
    return {"status": "case_received", "message": "Please connect WebSocket to begin debate."}




@router.post("/save-debate", dependencies=[Depends(is_logged_in)])
async def save_debate(request: Request, payload: SaveDebateRequest):
    try:
        user = request.state.user  # Access the injected user

        email = user.get("email")
        if not email:
            raise ValueError("User email not found in token")

        # Verify user exists
        if not await db.users.find_one({"email": email}):
            raise ValueError("User not found")

        debate_doc = {
            "debate_id": str(uuid4()),
            "user_id": str(user.get("_id")),  # Store _id as string
            "ipc_section": payload.ipc_section,
            "similar_case": payload.similar_case.dict(),
            "debate_history": [entry.dict() for entry in payload.debate_history],
            "status": "completed",
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }

        result = await db.debates.insert_one(debate_doc)  # Async motor operation
        return {
            "status": "success",
            "message": "Debate saved successfully",
            "debate_id": str(result.inserted_id)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save debate: {str(e)}")