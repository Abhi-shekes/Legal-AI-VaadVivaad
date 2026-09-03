"""The debate state machine.

Replaces `run_debate_flow`, which lived in the route module, blocked the
event loop on every call, ran exactly one round hard-coded as `range(1, 2)`,
kept its state in a module-level dict, and lost everything on a disconnect or
a restart.

Design notes:

* **Explicit states, one step at a time.** Every transition is a coroutine
  that takes the state and returns the next state, so the loop can be driven
  by a socket, a worker, or a test with no changes.
* **Durable.** State is persisted after every committed turn. A debate
  resumes from where it stopped rather than restarting — which also means a
  user who closes the tab does not lose work, and the tokens already spent
  are not spent again.
* **Interruptible.** The user can object mid-round; the objection is picked
  up before the next turn and the affected counsel must address it.
* **Bounded.** Every step charges the token ledger, and the whole run has a
  ceiling.

LangGraph would be a reasonable fit for this and is what the plan named. It
is not installable in this environment, and for a fixed five-phase graph an
explicit machine is clearer and keeps the checkpointing honest — the swap is
contained to this file.
"""

from __future__ import annotations

import asyncio
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Awaitable, Callable, Dict, List, Optional

from app.core.config import settings
from app.core.errors import BudgetExceeded, LLMError, VaadVivaadError
from app.core.llm import FAST, REASONING, TokenLedger, llm
from app.core.logging import Timer, get_logger, context as log_context
from app.domain.schemas import (
    ArgumentTurn,
    BenchRuling,
    CaseStructure,
    Phase,
    Precedent,
    SectionCandidate,
    SectionReference,
    Side,
    TurnRecord,
    utcnow,
)
from app.security import prompting
from app.services import analysis, citations, concordance, intake, retrieval
from app.services.debate import personas
from app.services.debate.context import ClaimLedger, DebateContext

log = get_logger(__name__)

Emit = Callable[[str, Dict[str, Any]], Awaitable[None]]


class Stage(str, Enum):
    CREATED = "created"
    STRUCTURING = "structuring"
    RESEARCHING = "researching"
    ARGUING = "arguing"
    RULING = "ruling"
    ANALYSING = "analysing"
    DONE = "done"
    FAILED = "failed"


# Which side speaks, in which phase, in order. The prosecution opens; the
# defence gets the last word in rebuttal, which mirrors how the burden runs.
_SCHEDULE: List[tuple] = [
    (Phase.OPENING, Side.PROSECUTION),
    (Phase.OPENING, Side.DEFENCE),
    (Phase.EVIDENCE, Side.PROSECUTION),
    (Phase.EVIDENCE, Side.DEFENCE),
    (Phase.REBUTTAL, Side.PROSECUTION),
    (Phase.REBUTTAL, Side.DEFENCE),
    (Phase.CLOSING, Side.PROSECUTION),
    (Phase.CLOSING, Side.DEFENCE),
]


@dataclass
class DebateState:
    """Everything needed to resume a debate from cold."""

    debate_id: str
    user_id: str
    description: str
    evidence_text: str = ""
    stage: Stage = Stage.CREATED
    step_index: int = 0
    case: Optional[CaseStructure] = None
    sections: List[SectionCandidate] = field(default_factory=list)
    statute: Optional[SectionReference] = None
    statute_verified: bool = False
    precedents: List[Precedent] = field(default_factory=list)
    turns: List[TurnRecord] = field(default_factory=list)
    claims: List[dict] = field(default_factory=list)
    ruling: Optional[BenchRuling] = None
    gaps: Optional[dict] = None
    strength: Optional[dict] = None
    objections: List[str] = field(default_factory=list)
    pending_objection: Optional[str] = None
    max_steps: int = 8
    tokens: Dict[str, Any] = field(default_factory=dict)
    error: Optional[str] = None
    created_at: str = field(default_factory=lambda: utcnow().isoformat())
    updated_at: str = field(default_factory=lambda: utcnow().isoformat())

    def to_dict(self) -> dict:
        return {
            "debate_id": self.debate_id,
            "user_id": self.user_id,
            "description": self.description,
            "evidence_text": self.evidence_text,
            "stage": self.stage.value,
            "step_index": self.step_index,
            "case": self.case.model_dump(mode="json") if self.case else None,
            "sections": [s.model_dump(mode="json") for s in self.sections],
            "statute": self.statute.model_dump(mode="json") if self.statute else None,
            "statute_verified": self.statute_verified,
            "precedents": [p.model_dump(mode="json") for p in self.precedents],
            "turns": [t.model_dump(mode="json") for t in self.turns],
            "claims": self.claims,
            "ruling": self.ruling.model_dump(mode="json") if self.ruling else None,
            "gaps": self.gaps,
            "strength": self.strength,
            "objections": self.objections,
            "pending_objection": self.pending_objection,
            "max_steps": self.max_steps,
            "tokens": self.tokens,
            "error": self.error,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
        }

    @classmethod
    def from_dict(cls, raw: dict) -> "DebateState":
        return cls(
            debate_id=raw["debate_id"],
            user_id=raw["user_id"],
            description=raw.get("description", ""),
            evidence_text=raw.get("evidence_text", ""),
            stage=Stage(raw.get("stage", "created")),
            step_index=raw.get("step_index", 0),
            case=CaseStructure.model_validate(raw["case"]) if raw.get("case") else None,
            sections=[SectionCandidate.model_validate(s) for s in raw.get("sections", [])],
            statute=SectionReference.model_validate(raw["statute"]) if raw.get("statute") else None,
            statute_verified=raw.get("statute_verified", False),
            precedents=[Precedent.model_validate(p) for p in raw.get("precedents", [])],
            turns=[TurnRecord.model_validate(t) for t in raw.get("turns", [])],
            claims=raw.get("claims", []),
            ruling=BenchRuling.model_validate(raw["ruling"]) if raw.get("ruling") else None,
            gaps=raw.get("gaps"),
            strength=raw.get("strength"),
            objections=raw.get("objections", []),
            pending_objection=raw.get("pending_objection"),
            max_steps=raw.get("max_steps", 8),
            tokens=raw.get("tokens", {}),
            error=raw.get("error"),
            created_at=raw.get("created_at", utcnow().isoformat()),
            updated_at=raw.get("updated_at", utcnow().isoformat()),
        )

    @property
    def primary_section(self) -> str:
        return self.sections[0].section if self.sections else ""

    @property
    def code(self) -> str:
        return self.sections[0].code if self.sections else "IPC"


class DebateMachine:
    """Drives one debate. Construct, then `await run()`."""

    def __init__(
        self,
        state: DebateState,
        emit: Emit,
        *,
        persist: Optional[Callable[[DebateState], Awaitable[None]]] = None,
        objection_source: Optional[Callable[[], Awaitable[Optional[str]]]] = None,
    ) -> None:
        self.state = state
        self.emit = emit
        self.persist = persist or self._no_persist
        self.objection_source = objection_source
        self.ledger = TokenLedger()
        self.context: Optional[DebateContext] = None

    @staticmethod
    async def _no_persist(_: DebateState) -> None:
        return None

    # ── Public entry point ───────────────────────────────────────────────

    async def run(self) -> DebateState:
        with log_context(debate_id=self.state.debate_id, user_id=self.state.user_id):
            try:
                # A case that argued but never got its order resumes at the
                # bench rather than starting over.
                if self.state.stage is Stage.DONE and self.state.ruling is None \
                        and self.state.turns:
                    self.state.stage = Stage.RULING
                if self.state.stage in (Stage.CREATED, Stage.STRUCTURING):
                    await self._structure()
                if self.state.stage is Stage.RESEARCHING:
                    await self._research()
                if self.state.stage is Stage.ARGUING:
                    await self._argue()
                if self.state.stage is Stage.RULING:
                    await self._rule()
                if self.state.stage is Stage.ANALYSING:
                    await self._analyse()
                await self._finish()
            except BudgetExceeded as exc:
                await self._degrade(exc, "budget_exceeded")
            except VaadVivaadError as exc:
                await self._fail(exc)
            except asyncio.CancelledError:
                # The client went away; the work already committed stays.
                log.info("debate.cancelled", extra={"stage": self.state.stage.value})
                await self._save()
                raise
            except Exception as exc:  # noqa: BLE001 - last line of defence
                log.exception("debate.unexpected")
                await self._fail(LLMError(str(exc)))
            return self.state

    # ── Stages ───────────────────────────────────────────────────────────

    async def _structure(self) -> None:
        self.state.stage = Stage.STRUCTURING
        await self._save()
        await self.emit("status", {"stage": "structuring",
                                   "message": "Reading the case…"})

        case, sections = await intake.prepare(
            self.state.description, self.state.evidence_text, ledger=self.ledger
        )
        self.state.case = case
        self.state.sections = sections
        self.state.stage = Stage.RESEARCHING
        # Longer matters earn more rounds; a simple one does not need four.
        self.state.max_steps = self._schedule_length(case, sections)
        await self._save()

        await self.emit("case_structured", {
            "case": case.model_dump(mode="json"),
            "sections": [s.model_dump(mode="json") for s in sections],
            "statute_note": concordance.statute_note(case.incident_date),
        })

    @staticmethod
    def _schedule_length(case: CaseStructure, sections: List[SectionCandidate]) -> int:
        """Rounds scale with the complexity of the matter, not a constant."""
        score = 4  # opening + evidence, both sides
        if len(case.evidence) >= 2 or case.disputed_facts:
            score += 2  # rebuttal is worth having
        if len(sections) > 1 or len(case.disputed_facts) > 1:
            score += 2  # closing
        return min(score, len(_SCHEDULE), settings.DEBATE_MAX_ROUNDS * 2)

    async def _research(self) -> None:
        await self.emit("status", {"stage": "researching",
                                   "message": "Searching statute and precedent…"})
        case = self.state.case
        assert case is not None
        section_numbers = [s.section for s in self.state.sections]

        with Timer() as timer:
            # Independent lookups run concurrently. In the old pipeline these
            # were three sequential awaits for no reason.
            precedents, statute = await asyncio.gather(
                retrieval.find_precedents(
                    case.summary, sections=section_numbers, crime_type=case.crime_type
                ),
                self._statute_for(self.state.primary_section, self.state.code),
            )

        self.state.precedents = precedents
        self.state.statute = statute
        self.state.stage = Stage.ARGUING
        await self._save()

        view = concordance.resolve(
            self.state.primary_section, code=self.state.code,
            incident_date=case.incident_date,
        )
        # This event never used to be emitted at all, so the frontend's
        # case-analysis panel — which gates on it — never rendered.
        await self.emit("case_details", {
            "summary": case.summary,
            "crime_type": case.crime_type,
            "section": view.to_payload(),
            "all_sections": [s.model_dump(mode="json") for s in self.state.sections],
            "statute": statute.model_dump(mode="json") if statute else None,
            "statute_verified": self.state.statute_verified,
            "precedents": [p.model_dump(mode="json") for p in precedents],
            "precedent_note": (
                "" if precedents else
                "No verified precedent was found for this matter. Both sides "
                "will argue from the statutory elements and the record."
            ),
            "statute_note": concordance.statute_note(case.incident_date),
            "research_ms": timer.ms,
        })
        log.info("debate.researched",
                 extra={"precedents": len(precedents), "ms": timer.ms,
                        "statute_verified": self.state.statute_verified})

    async def _statute_for(self, section: str, code: str) -> Optional[SectionReference]:
        """Curated corpus first; model-derived fallback clearly marked."""
        if not section:
            return None
        found = await retrieval.get_statute(section, code)
        if found is not None:
            self.state.statute_verified = True
            return found
        self.state.statute_verified = False
        try:
            return await intake.derive_statute(section, code, ledger=self.ledger)
        except LLMError as exc:
            log.warning("debate.statute_unavailable", extra={"error": str(exc)[:120]})
            return None

    def _build_context(self) -> DebateContext:
        assert self.state.case is not None
        context = DebateContext(
            case=self.state.case,
            statute=self.state.statute,
            precedents=self.state.precedents,
            sections=[s.section for s in self.state.sections],
            code=self.state.code,
            ledger=ClaimLedger.from_dicts(self.state.claims),
            recent=self.state.turns[-4:],
            user_evidence=self.state.evidence_text,
        )
        return context

    async def _argue(self) -> None:
        self.context = self._build_context()
        while self.state.step_index < self.state.max_steps:
            phase, side = _SCHEDULE[self.state.step_index]
            round_no = self.state.step_index // 2 + 1

            await self._pick_up_objection()
            try:
                await self._one_turn(phase, side, round_no)
            except BudgetExceeded:
                raise
            except LLMError as exc:
                # One bad turn does not end a hearing. Record it, tell the
                # room, and move on -- the old flow aborted the whole debate.
                log.warning("debate.turn_failed",
                            extra={"step": self.state.step_index,
                                   "side": side.value, "error": str(exc)[:160]})
                await self.emit("turn_failed", {
                    "side": side.value, "round": round_no,
                    "message": exc.user_message, "retryable": exc.retryable,
                })
            self.state.step_index += 1
            await self._save()

        self.state.stage = Stage.RULING
        await self._save()

    async def _one_turn(self, phase: Phase, side: Side, round_no: int) -> None:
        assert self.context is not None
        open_ids = [c.id for c in self.context.ledger.open_claims(against=side)]
        instruction = personas.turn_instruction(phase, side, open_ids)
        if self.state.pending_objection:
            instruction += personas.objection_instruction(self.state.pending_objection)
            self.state.objections.append(self.state.pending_objection)
            self.state.pending_objection = None

        prompt = self.context.assemble(side, phase, round_no, instruction)

        await self.emit("turn_start", {
            "side": side.value, "phase": phase.value, "round": round_no,
            "index": self.state.step_index,
        })

        turn: Optional[ArgumentTurn] = None
        # Closing submissions get the stronger tier: it is the turn that has
        # to hold the whole record together.
        tier = REASONING if phase is Phase.CLOSING else FAST
        async for kind, payload in llm.stream(
            prompt, ArgumentTurn,
            step=f"debate.{phase.value}.{side.value}",
            stream_field="argument",
            tier=tier,
            system=personas.counsel_system(side),
            temperature=0.55,
            think=(phase is Phase.CLOSING),
            ledger=self.ledger,
        ):
            if kind == "text":
                await self.emit("turn_delta", {"index": self.state.step_index,
                                               "text": payload})
            elif kind == "restart":
                # The stream dropped to a cheaper tier mid-turn; whatever text
                # already reached the client is stale, so tell it to discard.
                await self.emit("turn_restart", {"index": self.state.step_index,
                                                 "reason": payload.get("reason", "")})
            else:
                turn = payload

        if turn is None:
            raise LLMError("no turn produced")

        if prompting.output_is_compromised(turn.argument + turn.headline):
            log.error("debate.canary_tripped", extra={"side": side.value})
            raise LLMError("generated turn failed the injection canary")

        # Nothing reaches the transcript before its citations are checked.
        verification = citations.verify_turn(turn, self.state.precedents)
        record = TurnRecord(
            index=self.state.step_index,
            round=round_no,
            phase=phase,
            side=side,
            content=verification.turn,
            unsupported_citations=verification.unsupported_ids + verification.unsupported_names,
            tokens=self.ledger.by_step.get(f"debate.{phase.value}.{side.value}", 0),
        )
        claim = self.context.add_turn(record)
        self.state.turns.append(record)
        self.state.claims = self.context.ledger.to_dicts()

        await self.emit("turn_complete", {
            "index": record.index,
            "round": round_no,
            "phase": phase.value,
            "side": side.value,
            "claim_id": claim.id,
            "turn": verification.turn.model_dump(mode="json"),
            "citations": [
                p.model_dump(mode="json") for p in self.state.precedents
                if p.citation_id in verification.verified_ids
            ],
            "unsupported": record.unsupported_citations,
            "redacted": verification.redacted,
        })

    async def _pick_up_objection(self) -> None:
        if self.objection_source is None:
            return
        try:
            objection = await self.objection_source()
        except Exception:  # never let the interrupt channel break the hearing
            return
        if objection:
            self.state.pending_objection = objection
            await self.emit("objection_accepted", {"text": objection})

    async def _rule(self) -> None:
        """Deliver the order.

        A failure here must not discard the hearing: eight turns of argument
        that the user watched, and paid for, are a result on their own. The
        transcript is kept and the absence of an order is stated plainly.
        """
        await self.emit("status", {"stage": "ruling",
                                   "message": "The bench is considering…"})
        assert self.context is not None or self.state.turns
        context = self.context or self._build_context()

        transcript = "\n\n".join(
            f"[{t.side.value}, round {t.round}, {t.phase.value}] "
            f"{t.content.headline}\n{t.content.argument}"
            for t in self.state.turns
        ) or "(no argument was heard)"

        prompt = (
            context.immutable_block()
            + "\n\n## THE HEARING\n" + transcript
            + "\n\n## CLAIM LEDGER\n" + context.ledger.render(max_tokens=900)
            + "\n\n" + personas.bench_instruction(len(self.state.objections))
        )
        try:
            ruling = await llm.generate(
                prompt, BenchRuling, step="debate.bench", tier=REASONING,
                system=personas.bench_system(), temperature=0.3, think=True,
                ledger=self.ledger,
            )
        except (LLMError, BudgetExceeded) as exc:
            if not self.state.turns:
                raise
            log.warning("debate.ruling_unavailable",
                        extra={"error": str(exc)[:160], "turns": len(self.state.turns)})
            self.state.error = (
                "The hearing was argued in full, but the bench could not "
                "deliver an order — capacity was exhausted. The transcript is "
                "saved; reopen the case to have it ruled on."
            )
            self.state.stage = Stage.ANALYSING
            await self._save()
            await self.emit("ruling_unavailable", {
                "message": self.state.error,
                "turns": len(self.state.turns),
                "retryable": True,
            })
            return
        ruling = self._calibrate(ruling)
        self.state.ruling = ruling
        self.state.stage = Stage.ANALYSING
        await self._save()
        await self.emit("ruling", ruling.model_dump(mode="json"))
        log.info("debate.ruled", extra={"favoured": ruling.favoured_side.value,
                                        "confidence": round(ruling.confidence, 2)})

    def _calibrate(self, ruling: BenchRuling) -> BenchRuling:
        """Cap confidence at what the record can actually support.

        Models anchor to extremes: an early run returned 1.00 on a record with
        no identification evidence at all. Confidence is a claim about
        evidence, so it gets checked against the evidence the same way a
        citation does, rather than being taken on trust.
        """
        ceiling = 1.0
        reasons = []
        if not self.state.precedents:
            ceiling = min(ceiling, 0.75)
            reasons.append("no verified authority retrieved")
        if not self.state.statute_verified:
            ceiling = min(ceiling, 0.80)
            reasons.append("statute text unverified")
        if len(self.state.turns) < 4:
            ceiling = min(ceiling, 0.65)
            reasons.append("hearing was short")
        # An untested allegation never justifies near-certainty.
        ceiling = min(ceiling, 0.92)

        if ruling.confidence <= ceiling:
            return ruling
        log.info("debate.confidence_capped",
                 extra={"from": round(ruling.confidence, 2), "to": ceiling,
                        "reasons": reasons})
        note = ("Confidence is capped at %.2f because %s."
                % (ceiling, "; ".join(reasons) or "the record is untested"))
        return ruling.model_copy(update={
            "confidence": ceiling,
            "reasoning": (ruling.reasoning + "\n\n" + note).strip(),
        })

    async def _analyse(self) -> None:
        await self.emit("status", {"stage": "analysing",
                                   "message": "Auditing the record…"})
        context = self.context or self._build_context()
        assert self.state.case is not None

        try:
            gaps = await analysis.evidence_gaps(
                self.state.case, self.state.statute, context.ledger, tokens=self.ledger
            )
            self.state.gaps = gaps.model_dump(mode="json")
            await self.emit("evidence_gaps", self.state.gaps)

            if self.state.ruling is not None:
                strength = await analysis.case_strength(
                    self.state.case, self.state.ruling, context.ledger, gaps,
                    self.state.precedents, tokens=self.ledger,
                )
                self.state.strength = strength.model_dump(mode="json")
                await self.emit("strength", self.state.strength)
        except (LLMError, BudgetExceeded) as exc:
            # Analysis is additive; a ruling without it is still a result.
            log.warning("debate.analysis_skipped", extra={"error": str(exc)[:160]})

        self.state.stage = Stage.DONE
        await self._save()

    # ── Terminal ─────────────────────────────────────────────────────────

    async def _finish(self) -> None:
        self.state.tokens = self.ledger.summary()
        self.state.stage = Stage.DONE
        await self._save()
        await self.emit("concluded", {
            "debate_id": self.state.debate_id,
            "turns": len(self.state.turns),
            "rounds": (self.state.step_index + 1) // 2,
            "tokens": self.state.tokens,
            "unsupported_total": sum(len(t.unsupported_citations) for t in self.state.turns),
        })
        log.info("debate.done", extra={"turns": len(self.state.turns),
                                       **self.state.tokens})

    async def _degrade(self, exc: BudgetExceeded, reason: str) -> None:
        """Out of budget mid-hearing: keep what exists, still try to rule."""
        log.warning("debate.degraded", extra={"reason": reason,
                                              "tokens": self.ledger.total})
        self.state.tokens = self.ledger.summary()
        if self.state.ruling is None and self.state.turns:
            self.ledger.budget += 8000  # reserve enough to close properly
            try:
                await self._rule()
            except VaadVivaadError:
                pass
        self.state.stage = Stage.DONE
        self.state.error = exc.user_message
        await self._save()
        await self.emit("concluded", {
            "debate_id": self.state.debate_id,
            "turns": len(self.state.turns),
            "truncated": True,
            "message": exc.user_message,
            "tokens": self.state.tokens,
        })

    async def _fail(self, exc: VaadVivaadError) -> None:
        self.state.stage = Stage.FAILED
        self.state.error = exc.user_message
        self.state.tokens = self.ledger.summary()
        await self._save()
        # The frontend only ever reset on "concluded" or "failed"; without
        # this a mid-flow crash left the UI stuck with the button disabled.
        await self.emit("failed", {
            "debate_id": self.state.debate_id,
            **exc.to_payload(),
            "turns": len(self.state.turns),
        })
        log.error("debate.failed", extra={"code": exc.code, "detail": exc.detail[:200]})

    async def _save(self) -> None:
        self.state.updated_at = utcnow().isoformat()
        self.state.tokens = self.ledger.summary()
        await self.persist(self.state)


def new_debate(user_id: str, description: str, evidence_text: str = "") -> DebateState:
    return DebateState(
        debate_id=uuid.uuid4().hex,
        user_id=user_id,
        description=description,
        evidence_text=evidence_text,
    )
