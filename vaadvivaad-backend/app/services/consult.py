"""Questions put after the order has been made.

Two things share this module because they are the same machinery pointed at
different personas: putting a question to the bench about the order it made,
and asking either counsel about their side of it. Building them separately
would have meant two copies of the grounding, the fencing and the citation
check, which is exactly how the two drift apart.

Three rules hold for both:

- The question is user text, so it is fenced and the output is run through the
  injection canary, the same as a turn.
- Counsel may only cite from the shortlist that was retrieved for the matter.
  An answer is verified against it before it is stored, so the chat path
  cannot become a way to get an unverified authority out of the system.
- Neither persona may reopen the record. They answer on what was heard; if the
  answer would need something that was not in evidence, they say so.
"""

from __future__ import annotations

from typing import List, Optional, Sequence, Tuple

from app.core.errors import LLMError, ValidationFailed
from app.core.llm import FAST, REASONING, TokenLedger, llm
from app.core.logging import get_logger
from app.domain.schemas import (
    BenchAnswer,
    BenchRuling,
    CaseStructure,
    Consultation,
    CounselAnswer,
    Precedent,
    SectionReference,
    Side,
    TurnRecord,
)
from app.security import prompting
from app.services import citations as citation_service
from app.services.debate import personas

log = get_logger(__name__)

# How much of the hearing to put in front of the answering persona. The whole
# transcript would blow the budget on a long matter for very little gain --
# the order and the claim ledger already carry the shape of it.
_TRANSCRIPT_TURNS = 6

_BENCH_CONSULT = prompting.system_prompt(
    """You are the presiding judge who made the order in this matter. The
person whose matter it is is asking you a question about it.

Answer only on the record that was before you. You are explaining an order
you have already made -- you are not re-hearing the matter and you are not
making a new one.

`changes_outcome` is the important field and it is not a courtesy. Set it true
only where the answer would genuinely disturb the disposition you gave. A
hypothetical that would need evidence nobody has does not disturb an order;
say what the position would be and leave the flag false.

Where the question asks about something the record does not cover, say that
plainly. `basis` names the findings or the evidence your answer rests on."""
)


def _counsel_consult_system(side: Side) -> str:
    """Counsel answering a question, still in their role.

    Deliberately built from the same persona the turns use: an advocate who
    switches to neutral explanation the moment they are asked a direct
    question is not the same participant the user watched argue.
    """
    return personas.counsel_system(side) + prompting.system_prompt(
        """
The person whose matter this is is asking you a question directly, after the
order has been made.

Answer as their opponent's counsel would expect you to: from your side's
position, on this record. Do not concede your case to be agreeable, and do not
overstate it either -- if the record does not support what they are hoping to
hear, put that in `caveat` rather than burying it.

Cite only from the authorities listed. Never name a case that is not there."""
    )


def _record_block(
    case: CaseStructure,
    statute: Optional[SectionReference],
    precedents: Sequence[Precedent],
    turns: Sequence[TurnRecord],
    ruling: Optional[BenchRuling],
) -> str:
    """The shared grounding both personas answer from."""
    recent = list(turns)[-_TRANSCRIPT_TURNS:]
    transcript = "\n\n".join(
        f"[{t.side.value}, round {t.round}, {t.phase.value}] "
        f"{t.content.headline}\n{t.content.argument}"
        for t in recent
    ) or "(no argument was heard)"

    block = (
        f"## MATTER\n{case.summary}\n\n"
        f"## SECTION\n{statute.for_prompt() if statute else 'not available'}\n\n"
        f"## AUTHORITIES\n{citation_service.citation_block(precedents)}\n\n"
        f"## THE HEARING (last {len(recent)} submissions)\n{transcript}\n\n"
    )
    if ruling is not None:
        block += (
            "## THE ORDER MADE\n"
            f"Decisive issue: {ruling.decisive_issue}\n"
            f"Disposition: {ruling.disposition}\n"
            f"Favoured: {ruling.favoured_side.value} "
            f"(confidence {ruling.confidence:.2f})\n\n"
        )
    return block


def _thread_block(history: Sequence[dict], role: str) -> str:
    """Earlier questions to the same persona, so a follow-up follows on."""
    same = [h for h in history if h.get("role") == role][-4:]
    if not same:
        return ""
    rendered = "\n\n".join(
        f"Q: {h.get('question', '')}\nA: {h.get('answer', '')}" for h in same
    )
    return "## EARLIER IN THIS EXCHANGE\n" + rendered + "\n\n"


def _guard_question(question: str) -> str:
    text = (question or "").strip()
    if not text:
        raise ValidationFailed("empty question",
                               user_message="Type a question first.")
    signals = prompting.scan_for_injection(text)
    if signals:
        log.warning("consult.injection_signals",
                    extra={"signals": signals, "preview": prompting.preview(text)})
    return text


async def ask_bench(
    question: str,
    case: CaseStructure,
    statute: Optional[SectionReference],
    precedents: Sequence[Precedent],
    turns: Sequence[TurnRecord],
    ruling: Optional[BenchRuling],
    history: Sequence[dict] = (),
    *,
    tokens: Optional[TokenLedger] = None,
) -> Consultation:
    """Put a question to the bench about the order it made."""
    text = _guard_question(question)

    prompt = (
        _record_block(case, statute, precedents, turns, ruling)
        + _thread_block(history, "bench")
        + "## THE QUESTION\n"
        + prompting.fence(text, "QUESTION")
        + "\n\nAnswer it."
    )
    # The stronger tier: this answers "would the verdict change", which is not
    # a question to be glib about.
    answer = await llm.generate(
        prompt, BenchAnswer, step="consult.bench", tier=REASONING,
        system=_BENCH_CONSULT, temperature=0.2, think=True, ledger=tokens,
    )

    if prompting.output_is_compromised(answer.answer):
        log.error("consult.canary_tripped", extra={"role": "bench"})
        raise LLMError("the answer failed the injection canary")

    log.info("consult.bench", extra={"changes_outcome": answer.changes_outcome,
                                     "confidence": round(answer.confidence, 2)})
    return Consultation(
        role="bench",
        question=text,
        answer=answer.answer,
        basis=answer.basis,
        changes_outcome=answer.changes_outcome,
        confidence=answer.confidence,
    )


async def ask_counsel(
    side: Side,
    question: str,
    case: CaseStructure,
    statute: Optional[SectionReference],
    precedents: Sequence[Precedent],
    turns: Sequence[TurnRecord],
    ruling: Optional[BenchRuling],
    history: Sequence[dict] = (),
    *,
    tokens: Optional[TokenLedger] = None,
) -> Consultation:
    """Ask one side's counsel about the matter, in their role."""
    text = _guard_question(question)

    prompt = (
        _record_block(case, statute, precedents, turns, ruling)
        + _thread_block(history, side.value)
        + "## THE QUESTION\n"
        + prompting.fence(text, "QUESTION")
        + "\n\nAnswer it."
    )
    answer = await llm.generate(
        prompt, CounselAnswer, step=f"consult.{side.value}", tier=FAST,
        system=_counsel_consult_system(side), temperature=0.4, ledger=tokens,
    )

    if prompting.output_is_compromised(answer.answer + answer.caveat):
        log.error("consult.canary_tripped", extra={"role": side.value})
        raise LLMError("the answer failed the injection canary")

    # Same rule as a turn: an authority that is not in the retrieved shortlist
    # does not leave the building.
    allowed = {p.citation_id for p in precedents if p.citation_id and p.verified}
    verified = [cid for cid in answer.relies_on if cid in allowed]
    dropped = [cid for cid in answer.relies_on if cid not in allowed]
    if dropped:
        log.warning("consult.unsupported_citations",
                    extra={"role": side.value, "dropped": dropped})

    body = answer.answer
    if answer.caveat:
        body += f"\n\n{answer.caveat}"

    log.info("consult.counsel", extra={"side": side.value,
                                       "citations": len(verified)})
    return Consultation(
        role=side.value,
        question=text,
        answer=body,
        relies_on=verified,
    )


async def answer(
    role: str,
    question: str,
    case: CaseStructure,
    statute: Optional[SectionReference],
    precedents: Sequence[Precedent],
    turns: Sequence[TurnRecord],
    ruling: Optional[BenchRuling],
    history: Sequence[dict] = (),
    *,
    tokens: Optional[TokenLedger] = None,
) -> Consultation:
    """Route a question to whichever participant was asked."""
    if role == "bench":
        return await ask_bench(question, case, statute, precedents, turns,
                               ruling, history, tokens=tokens)
    if role in (Side.PROSECUTION.value, Side.DEFENCE.value):
        return await ask_counsel(Side(role), question, case, statute, precedents,
                                 turns, ruling, history, tokens=tokens)
    raise ValidationFailed(
        f"unknown role {role}",
        user_message="Ask the bench, the prosecution, or the defence.",
    )
