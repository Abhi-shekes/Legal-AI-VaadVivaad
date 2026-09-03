"""Case routes.

Replaces the old `/user/*` surface. The important changes:

  * every route requires authentication — `start-case` did not, so anyone
    could spend the API quota anonymously;
  * the **server** mints the case id, and it is an opaque uuid rather than a
    client-supplied ten-digit number that could be guessed to join someone
    else's live debate;
  * the debate is created and returned immediately with a resumable URL; the
    hearing itself runs over the socket or can be resumed later.
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Request, Response
from pydantic import BaseModel, Field

from app.api.deps import Identity, current_user, limit_api, limit_debate
from app.core.errors import NotFound, ValidationFailed
from app.core.llm import TokenLedger
from app.core.logging import bind, get_logger
from app.db import repository
from app.domain.schemas import Side
from app.services import analysis, documents, export, guard, intake, retrieval, translation
from app.services.debate.machine import DebateState, new_debate

log = get_logger(__name__)
router = APIRouter()


class CreateCaseRequest(BaseModel):
    incident_description: str = Field(min_length=1, max_length=20_000)
    evidence: str = Field(default="", max_length=20_000)


class ObjectionRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2_000)


class ArgumentSubmission(BaseModel):
    side: Side
    text: str = Field(min_length=1, max_length=8_000)
    answering: str = Field(default="", max_length=2_000)


class PreferencesRequest(BaseModel):
    language: Optional[str] = Field(default=None, max_length=20)
    default_side: Optional[Side] = None
    verbosity: Optional[str] = Field(default=None, max_length=20)


@router.post("/cases", status_code=201)
async def create_case(
    payload: CreateCaseRequest,
    identity: Identity = Depends(limit_debate),
):
    """Screen the submission and open a case. Cheap: no debate runs yet."""
    ledger = TokenLedger()
    verdict = await guard.screen(payload.incident_description, ledger=ledger)

    if not verdict.allowed:
        # A 200 with a routing decision, not an error. The old flow emitted an
        # error and then disconnected the socket, so the only way back was a
        # page reload.
        log.info("cases.rejected", extra={"decision": verdict.decision.value})
        return {
            "status": "rejected",
            "guard": verdict.to_payload(),
            "debate_id": None,
        }

    state = new_debate(identity.user_id, payload.incident_description, payload.evidence)
    await repository.save_debate_state(state.to_dict())
    bind(debate_id=state.debate_id)
    log.info("cases.created")

    return {
        "status": "created",
        "debate_id": state.debate_id,
        "guard": verdict.to_payload(),
        # The case is addressable immediately, so the work survives the tab.
        "resume_url": f"/user/case/{state.debate_id}",
    }


@router.post("/cases/upload", status_code=201)
async def create_case_from_document(
    request: Request,
    identity: Identity = Depends(limit_debate),
):
    """Open a case from an FIR, chargesheet, notice or bail order.

    The document is parsed into the same structure the typed path produces and
    is shown back for correction, so both intake routes converge before
    anything expensive runs.

    The file is sent as the raw request body rather than as multipart form
    data: there is exactly one file and no other fields, so multipart buys
    nothing here beyond a parsing dependency. Filename and note ride on
    headers.

        fetch(url, {method: "POST", body: file,
                    headers: {"Content-Type": file.type,
                              "X-Filename": file.name}})
    """
    data = await request.body()
    content_type = request.headers.get("content-type", "")
    filename = request.headers.get("x-filename", "")
    note = request.headers.get("x-note", "")[:2000]

    ledger = TokenLedger()
    structure, kind = await documents.extract_from_bytes(
        data, content_type, filename, extra_note=note, ledger=ledger,
    )
    description, evidence = documents.to_submission(structure)

    verdict = await guard.screen(description, ledger=ledger)
    if not verdict.allowed:
        return {"status": "rejected", "guard": verdict.to_payload(), "debate_id": None}

    state = new_debate(identity.user_id, description, evidence)
    state.case = structure  # keep the richer parse; intake will refine it
    await repository.save_debate_state(state.to_dict())
    log.info("cases.created_from_document", extra={"kind": kind})
    return {
        "status": "created",
        "debate_id": state.debate_id,
        "document_kind": kind,
        "extracted": structure.model_dump(mode="json"),
        "guard": verdict.to_payload(),
        "resume_url": f"/user/case/{state.debate_id}",
    }


@router.post("/cases/{debate_id}/translate")
async def translate_case(
    debate_id: str,
    target: str = Query(..., min_length=2, max_length=5),
    identity: Identity = Depends(limit_api),
):
    """Render a concluded hearing in the user's language."""
    if target not in translation.SUPPORTED:
        raise ValidationFailed(
            f"unsupported language {target}",
            user_message="That language is not supported yet.",
        )
    doc = await repository.load_debate_state(debate_id, identity.user_id)
    if doc is None:
        raise NotFound("no such case")
    state = DebateState.from_dict(doc)

    ledger = TokenLedger()
    turns = []
    for turn in state.turns:
        turns.append({
            "index": turn.index, "side": turn.side.value, "round": turn.round,
            "headline": await translation.from_english(turn.content.headline, target, ledger=ledger),
            "argument": await translation.from_english(turn.content.argument, target, ledger=ledger),
        })
    ruling = None
    if state.ruling:
        ruling = {
            "decisive_issue": await translation.from_english(
                state.ruling.decisive_issue, target, ledger=ledger),
            "disposition": await translation.from_english(
                state.ruling.disposition, target, ledger=ledger),
            "confidence": state.ruling.confidence,
        }
    return {"status": "success",
            "data": {"language": target, "language_name": translation.language_name(target),
                     "turns": turns, "ruling": ruling}}


@router.get("/languages")
async def languages():
    return {"status": "success",
            "data": [{"code": c, "name": m["name"]} for c, m in translation.SUPPORTED.items()]}


@router.get("/cases")
async def list_cases(identity: Identity = Depends(limit_api),
                     limit: int = Query(50, ge=1, le=200)):
    return {"status": "success", "data": await repository.list_debates(identity.user_id, limit)}


@router.get("/cases/{debate_id}")
async def get_case(debate_id: str, identity: Identity = Depends(limit_api)):
    doc = await repository.load_debate_state(debate_id, identity.user_id)
    if doc is None:
        raise NotFound("no such case")
    return {"status": "success", "data": doc}


@router.delete("/cases/{debate_id}")
async def delete_case(debate_id: str, identity: Identity = Depends(limit_api)):
    if not await repository.delete_debate(debate_id, identity.user_id):
        raise NotFound("no such case")
    return {"status": "success", "message": "Case deleted."}


@router.post("/cases/{debate_id}/objection")
async def raise_objection(
    debate_id: str, payload: ObjectionRequest,
    identity: Identity = Depends(limit_api),
):
    """Interject a fact or a challenge mid-hearing.

    Queued on the state; the machine picks it up before the next turn and the
    affected counsel has to address it.
    """
    doc = await repository.load_debate_state(debate_id, identity.user_id)
    if doc is None:
        raise NotFound("no such case")
    doc["pending_objection"] = payload.text
    await repository.save_debate_state(doc)
    return {"status": "success", "message": "Objection noted; counsel will address it."}


@router.post("/cases/{debate_id}/argue")
async def submit_argument(
    debate_id: str, payload: ArgumentSubmission,
    identity: Identity = Depends(limit_debate),
):
    """Take-a-side mode: the user argues, the bench scores it."""
    doc = await repository.load_debate_state(debate_id, identity.user_id)
    if doc is None:
        raise NotFound("no such case")
    state = DebateState.from_dict(doc)
    if state.case is None:
        raise ValidationFailed("the case has not been structured yet")

    ledger = TokenLedger()
    score = await analysis.score_user_argument(
        payload.text, payload.side, state.case, state.statute,
        state.precedents, payload.answering, tokens=ledger,
    )
    doc.setdefault("user_arguments", []).append({
        "side": payload.side.value,
        "text": payload.text,
        "score": score.model_dump(mode="json"),
    })
    await repository.save_debate_state(doc)
    return {"status": "success", "data": score.model_dump(mode="json")}


@router.get("/cases/{debate_id}/brief")
async def download_brief(
    debate_id: str, identity: Identity = Depends(limit_api),
    fmt: str = Query("pdf", pattern="^(pdf|html|docx)$"),
):
    """Export the record as a formatted case brief."""
    doc = await repository.load_debate_state(debate_id, identity.user_id)
    if doc is None:
        raise NotFound("no such case")
    state = DebateState.from_dict(doc)
    content, media_type, filename = await export.render_brief(state, fmt)
    return Response(
        content=content, media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.put("/preferences")
async def update_preferences(payload: PreferencesRequest,
                             identity: Identity = Depends(limit_api)):
    """Cross-case memory is preferences only — never facts from one matter."""
    values = {k: (v.value if isinstance(v, Side) else v)
              for k, v in payload.model_dump(exclude_none=True).items()}
    if not values:
        raise ValidationFailed("nothing to update")
    return {"status": "success",
            "data": await repository.set_preferences(identity.user_id, values)}


@router.get("/statute/{section}")
async def statute_lookup(section: str, code: str = Query("IPC", pattern="^(IPC|BNS)$"),
                         incident_date: str = Query(""),
                         identity: Identity = Depends(limit_api)):
    """Section reference with its IPC/BNS counterpart."""
    from app.services import concordance

    view = concordance.resolve(section, code=code, incident_date=incident_date)
    reference = await retrieval.get_statute(view.primary_section, view.primary_code)
    return {
        "status": "success",
        "data": {
            "section": view.to_payload(),
            "reference": reference.model_dump(mode="json") if reference else None,
            "verified": reference is not None,
            "note": concordance.statute_note(incident_date),
        },
    }
