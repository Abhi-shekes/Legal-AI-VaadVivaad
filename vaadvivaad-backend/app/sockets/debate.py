"""Socket.IO handlers for the live hearing.

The previous handlers authenticated nothing. `connect` accepted anyone,
`join_room` accepted any session id, and session ids were client-generated
ten-digit numbers — so enumerating rooms let you read other people's case
debates in real time.

Now the JWT is validated during the handshake, the socket is bound to a user
id for its lifetime, and joining a case room requires that the case belong to
that user.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional
from urllib.parse import parse_qs

from app.auth import tokens
from app.core.errors import NotAuthenticated, PermissionDenied, VaadVivaadError
from app.core.logging import bind, get_logger, new_request_id
from app.core.logging import context as log_context
from app.db import repository
from app.services import concordance
from app.services.debate.machine import DebateMachine, DebateState, Stage
from app.socket_instance import sio

log = get_logger(__name__)

# sid -> {"user_id": ..., "debate_id": ...}
_sessions: Dict[str, Dict[str, Any]] = {}
# debate_id -> task, so a second "start" cannot run the same hearing twice.
_running: Dict[str, asyncio.Task] = {}


def _token_from_environ(environ: Dict[str, Any], auth: Optional[Dict]) -> Optional[str]:
    """Handshake credentials: `auth` payload, cookie, or query string."""
    if auth and isinstance(auth, dict):
        candidate = auth.get("token")
        if candidate:
            return candidate
    cookies = environ.get("HTTP_COOKIE", "")
    for part in cookies.split(";"):
        name, _, value = part.strip().partition("=")
        if name == "token" and value:
            return value
    query = parse_qs(environ.get("QUERY_STRING", ""))
    values = query.get("token")
    return values[0] if values else None


@sio.event
async def connect(sid: str, environ: Dict[str, Any], auth: Optional[Dict] = None) -> None:
    raw = _token_from_environ(environ, auth)
    if not raw:
        log.warning("socket.rejected", extra={"reason": "no credentials"})
        raise ConnectionRefusedError("authentication required")
    try:
        payload = tokens.decode(raw, expected_type=tokens.ACCESS)
    except NotAuthenticated as exc:
        log.warning("socket.rejected", extra={"reason": str(exc)[:80]})
        raise ConnectionRefusedError("invalid or expired session") from exc

    _sessions[sid] = {"user_id": payload["sub"], "email": payload.get("email", "")}
    log.info("socket.connected", extra={"user_id": payload["sub"]})


@sio.event
async def disconnect(sid: str) -> None:
    session = _sessions.pop(sid, None)
    # The hearing deliberately keeps running: turns are persisted as they
    # complete, so a user who closes the tab finds the transcript waiting
    # rather than losing the work and the tokens already spent.
    log.info("socket.disconnected",
             extra={"user_id": (session or {}).get("user_id"),
                    "debate_id": (session or {}).get("debate_id")})


@sio.on("join_case")
async def join_case(sid: str, data: Dict[str, Any]) -> Dict[str, Any]:
    session = _sessions.get(sid)
    if not session:
        return {"status": "error", "message": "Not authenticated."}
    debate_id = (data or {}).get("debate_id", "")
    if not debate_id:
        return {"status": "error", "message": "No case specified."}

    try:
        doc = await repository.load_debate_state(debate_id, session["user_id"])
    except PermissionDenied:
        log.warning("socket.join_denied", extra={"user_id": session["user_id"],
                                                 "debate_id": debate_id})
        return {"status": "error", "message": "You do not have access to this case."}
    if doc is None:
        return {"status": "error", "message": "No such case."}

    await sio.enter_room(sid, debate_id)
    session["debate_id"] = debate_id
    log.info("socket.joined", extra={"user_id": session["user_id"],
                                     "debate_id": debate_id})
    return {"status": "ok", "stage": doc.get("stage"),
            "turns": len(doc.get("turns") or [])}


@sio.on("start_debate")
async def start_debate(sid: str, data: Dict[str, Any]) -> Dict[str, Any]:
    session = _sessions.get(sid)
    if not session:
        return {"status": "error", "message": "Not authenticated."}
    debate_id = (data or {}).get("debate_id") or session.get("debate_id")
    if not debate_id:
        return {"status": "error", "message": "No case specified."}

    if debate_id in _running and not _running[debate_id].done():
        return {"status": "already_running"}

    try:
        doc = await repository.load_debate_state(debate_id, session["user_id"])
    except PermissionDenied:
        return {"status": "error", "message": "You do not have access to this case."}
    if doc is None:
        return {"status": "error", "message": "No such case."}

    state = DebateState.from_dict(doc)
    finished_without_order = (
        state.stage is Stage.DONE and state.ruling is None and bool(state.turns)
    )
    if state.stage in (Stage.DONE, Stage.FAILED) and not finished_without_order:
        # Resuming a finished hearing replays it from storage rather than
        # paying to generate it again.
        await _replay(debate_id, state)
        return {"status": "replayed"}

    if finished_without_order:
        # Argued but never ruled -- usually upstream capacity. Replay what
        # exists so the client is not staring at an empty page, then finish.
        await _replay(debate_id, state, include_close=False)
        _running[debate_id] = asyncio.create_task(_run(debate_id, state))
        return {"status": "resuming", "resumed": True}

    _running[debate_id] = asyncio.create_task(_run(debate_id, state))
    return {"status": "started", "resumed": state.step_index > 0}


@sio.on("object")
async def raise_objection(sid: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Interrupt the hearing with a fact or a challenge."""
    session = _sessions.get(sid)
    if not session:
        return {"status": "error", "message": "Not authenticated."}
    debate_id = (data or {}).get("debate_id") or session.get("debate_id")
    text = ((data or {}).get("text") or "").strip()[:2000]
    if not (debate_id and text):
        return {"status": "error", "message": "Nothing to record."}
    try:
        doc = await repository.load_debate_state(debate_id, session["user_id"])
    except PermissionDenied:
        return {"status": "error", "message": "You do not have access to this case."}
    if doc is None:
        return {"status": "error", "message": "No such case."}
    doc["pending_objection"] = text
    await repository.save_debate_state(doc)
    return {"status": "ok"}


# ── Runner ───────────────────────────────────────────────────────────────

def _emitter(debate_id: str):
    async def emit(event: str, payload: Dict[str, Any]) -> None:
        await sio.emit(event, payload, room=debate_id)
    return emit


async def _persist(state: DebateState) -> None:
    await repository.save_debate_state(state.to_dict())


def _objection_reader(debate_id: str, user_id: str):
    async def read() -> Optional[str]:
        doc = await repository.load_debate_state(debate_id, user_id)
        if not doc:
            return None
        pending = doc.get("pending_objection")
        if pending:
            doc["pending_objection"] = None
            await repository.save_debate_state(doc)
        return pending
    return read


async def _run(debate_id: str, state: DebateState) -> None:
    request_id = new_request_id()
    with log_context(request_id=request_id, debate_id=debate_id,
                     user_id=state.user_id):
        machine = DebateMachine(
            state,
            _emitter(debate_id),
            persist=_persist,
            objection_source=_objection_reader(debate_id, state.user_id),
        )
        try:
            await machine.run()
        except asyncio.CancelledError:
            raise
        except VaadVivaadError as exc:
            await sio.emit("failed", exc.to_payload(), room=debate_id)
        except Exception:  # noqa: BLE001
            log.exception("socket.run_failed")
            await sio.emit("failed",
                           {"code": "internal_error",
                            "message": "The hearing stopped unexpectedly. "
                                       "Your transcript so far has been saved."},
                           room=debate_id)
        finally:
            _running.pop(debate_id, None)


async def _replay(debate_id: str, state: DebateState,
                  *, include_close: bool = True) -> None:
    """Re-emit a completed hearing so a reconnecting client can render it."""
    emit = _emitter(debate_id)
    if state.case:
        await emit("case_structured", {
            "case": state.case.model_dump(mode="json"),
            "sections": [s.model_dump(mode="json") for s in state.sections],
        })
        # The live path sends a resolved `section` view and the client renders
        # the provision engaged from it. Replay omitted it, so a resumed hearing
        # showed an em dash where the section should be.
        leading = state.sections[0] if state.sections else None
        section_view = (
            concordance.resolve(leading.section, code=leading.code,
                                incident_date=state.case.incident_date).to_payload()
            if leading else {}
        )
        await emit("case_details", {
            "summary": state.case.summary,
            "crime_type": state.case.crime_type,
            "section": section_view,
            "statute_note": concordance.statute_note(state.case.incident_date),
            "statute": state.statute.model_dump(mode="json") if state.statute else None,
            "statute_verified": state.statute_verified,
            "precedents": [p.model_dump(mode="json") for p in state.precedents],
            "all_sections": [s.model_dump(mode="json") for s in state.sections],
            "replayed": True,
        })
    for turn in state.turns:
        await emit("turn_complete", {
            "index": turn.index, "round": turn.round, "phase": turn.phase.value,
            "side": turn.side.value, "turn": turn.content.model_dump(mode="json"),
            "unsupported": turn.unsupported_citations, "replayed": True,
            "citations": [p.model_dump(mode="json") for p in state.precedents
                          if p.citation_id in turn.content.relies_on],
        })
    # Orders this hearing superseded, so a reopened case shows its history
    # rather than presenting the latest order as if it were the only one.
    if state.prior_rulings:
        await emit("prior_rulings", {"rulings": state.prior_rulings,
                                     "continuations": state.continuations})
    if state.ruling:
        await emit("ruling", state.ruling.model_dump(mode="json"))
    if state.gaps:
        await emit("evidence_gaps", state.gaps)
    if state.strength:
        await emit("strength", state.strength)
    if include_close:
        await emit("concluded", {"debate_id": debate_id, "turns": len(state.turns),
                                 "replayed": True, "tokens": state.tokens})
