from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import time
import traceback

# --- Controller Imports ---
from app.controller.vectordbcontroller.find_similar_case import find_similar_cases
from app.controller.geminiController.DRAFT_USER_INPUT_MAIN import generate_user_prompt_properly
from app.controller.geminiController.COUNTER_ARGUMENT_MAIN import generate_counter_argument
from app.controller.geminiController.IPC_SECTION_MAIN import generate_ipc_section, generate_ipc_section_desc
from app.controller.geminiController.SIMILAR_CASES_MAIN import get_similar_cases_for_section
from app.controller.geminiController.EVIDENCE_MAIN import generate_evidence_for_section
from app.controller.geminiController.ARGUMENT_MAIN import generate_argument, generate_argument_first_time

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
        # FIX: The RuntimeWarning was because this was not awaited.
        await sio.enter_room(sid, session_id)
        # Store the client's sid for cleanup on disconnect
        if session_id in case_data_store:
            case_data_store[session_id]['sid'] = sid
        print(f"✅ Client {sid} has joined room '{session_id}'")

# --- Helper Functions ---

async def send_to_ui(session_id: str, event: str, data: dict):
     # print(f"\n🚀 Emitting event '{event}' to room '{session_id}'")
    await sio.emit(event, data, room=session_id)

async def run_debate_flow(session_id: str):
    """The main debate logic, now separated."""
    try:
        if session_id not in case_data_store:
            raise ValueError("Case data not found for session.")

        case_request_data = case_data_store[session_id]
        incident_description = case_request_data['incident_description']

        print(f"--- Starting debate flow for SID: {session_id} ---")
        await send_to_ui(session_id, "case_status", {"message": "Debate started. Processing initial details..."})

        # ... (The entire debate logic from your old post handler goes here) ...
        processed_prompt = generate_user_prompt_properly(incident_description)
        #case_laws_resp = find_similar_cases(processed_prompt)

        #if not case_laws_resp:
        ipc_section = generate_ipc_section(processed_prompt)
        similar_case_obj = get_similar_cases_for_section(ipc_section[0])
        ipc_section_detail = generate_ipc_section_desc(ipc_section[0])
        ipc_section_evidence_obj = generate_evidence_for_section(ipc_section[0])
        similar_case = similar_case_obj[0] if similar_case_obj else {}
        ipc_section_evidence = ipc_section_evidence_obj[0]['typical_evidence'] if ipc_section_evidence_obj else []
        

       
        first_response = generate_argument_first_time(
            processed_prompt, similar_case, ipc_section_detail, ipc_section_evidence,
        )
        await send_to_ui(session_id, "new_argument", {
            "role": "supporting", "argument": first_response[0], "round": 0
        })

        current_argument = first_response[0]
        for round_num in range(1, 5):
            await send_to_ui(session_id, "typing", {"role": "opposing"})
            await sio.sleep(2)
            counter_response = generate_counter_argument(
                processed_prompt, similar_case, ipc_section_detail, ipc_section_evidence, current_argument,
            )
            current_argument = counter_response[0]
            await send_to_ui(session_id, "new_argument", {
                "role": "opposing", "argument": current_argument, "round": round_num
            })
            await send_to_ui(session_id, "typing", {"role": "supporting"})
            await sio.sleep(2)
            rebuttal_response = generate_argument(
                processed_prompt, similar_case, ipc_section_detail, ipc_section_evidence, current_argument,
            )
            current_argument = rebuttal_response[0]
            await send_to_ui(session_id, "new_argument", {
                "role": "supporting", "argument": current_argument, "round": round_num
            })

        await send_to_ui(session_id, "debate_concluded", {"total_rounds": 5})
        print(f"--- Debate completed successfully for SID: {session_id} ---")

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


# --- HTTP Endpoint (Now much simpler) ---
@router.post("/start-case")
async def start_case_flow(case_request: CaseRequest):
    """Receives case data, stores it, and tells the client to connect."""
    print(f"Received case data for session: {case_request.session_id}")
    # Store the data, ready for the websocket handler to use it.
    case_data_store[case_request.session_id] = {
        "incident_description": case_request.incident_description,
        "evidence": case_request.evidence
    }
    return {"status": "case_received", "message": "Please connect WebSocket to begin debate."}