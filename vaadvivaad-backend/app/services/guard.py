"""The guard layer: scope, welfare, injection and abuse screening.

Replaces the old single "is this legal? yes/no" classifier whose failure mode
was `sio.disconnect()` — the user's session was destroyed and only a page
reload recovered it.

Scope is now a four-way decision plus a welfare flag, and nothing here ever
drops the connection: an out-of-scope input gets an explanation and a worked
example, which is a redirect rather than a dead end.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import List, Optional

from app.core.llm import FAST, TokenLedger, llm
from app.core.logging import get_logger
from app.domain.schemas import ScopeAssessment, ScopeDecision
from app.security import prompting

log = get_logger(__name__)

# Indian helplines. Shown before anything else runs when the narrative
# suggests ongoing danger or self-harm risk. In a criminal-law product this
# is a regular occurrence, not an edge case.
HELPLINES = [
    {"name": "Emergency services", "number": "112"},
    {"name": "Police", "number": "100"},
    {"name": "Women's helpline", "number": "1091"},
    {"name": "Childline", "number": "1098"},
    {"name": "Tele-MANAS (mental health)", "number": "14416"},
]

# Cheap pre-filters. These run before any model call so an obviously empty or
# abusive submission never costs a token.
_MIN_WORDS = 5

_PLANNING_PATTERNS = [
    re.compile(r"\b(how (can|do) i|help me|best way to|what's the easiest way to)\b"
               r"[^.?\n]{0,60}\b(get away with|avoid getting caught|not get caught|"
               r"destroy (the )?evidence|dispose of (the )?body|hide the body|"
               r"bribe|forge|fabricate (the )?evidence|threaten (the )?witness|"
               r"intimidate (the )?witness|tamper)", re.I),
    re.compile(r"\b(plan(ning)? to|going to|intend to|want to)\b[^.?\n]{0,40}"
               r"\b(kill|murder|rape|kidnap|abduct|assault|poison)\b[^.?\n]{0,40}"
               r"\b(tomorrow|tonight|next week|soon|him|her|them)\b", re.I),
]

_WELFARE_PATTERNS = [
    re.compile(r"\b(kill myself|end my life|suicide|suicidal|self.harm|"
               r"want to die|no reason to live)\b", re.I),
    re.compile(r"\b(he|she|they|husband|wife|father|mother|they)\b[^.\n]{0,30}"
               r"\b(is|are|keeps?)\b[^.\n]{0,20}\b(beating|hitting|abusing|"
               r"threatening to kill)\b[^.\n]{0,20}\b(me|us)\b", re.I),
    re.compile(r"\b(in danger right now|about to hurt me|outside my (house|door)|"
               r"threatening me right now)\b", re.I),
]


@dataclass
class GuardResult:
    decision: ScopeDecision
    reason: str = ""
    suggestion: str = ""
    welfare: bool = False
    helplines: List[dict] = field(default_factory=list)
    injection_signals: List[str] = field(default_factory=list)
    pii_kinds: List[str] = field(default_factory=list)

    @property
    def allowed(self) -> bool:
        return self.decision == ScopeDecision.IN_SCOPE

    def to_payload(self) -> dict:
        return {
            "decision": self.decision.value,
            "reason": self.reason,
            "suggestion": self.suggestion,
            "welfare": self.welfare,
            "helplines": self.helplines if self.welfare else [],
        }


_EXAMPLE = (
    "For example: “On 3 March my shop in Pune was broken into overnight. "
    "The lock was cut, about ₹40,000 in cash was taken, and the CCTV covering "
    "the entrance was working.”"
)

_SYSTEM = prompting.system_prompt(
    """You screen submissions for an Indian criminal-law analysis service that
stages an adversarial debate between prosecution and defence counsel.

Classify the described situation into exactly one decision:

- in_scope: an incident that engages Indian criminal law (IPC / Bharatiya
  Nyaya Sanhita) — theft, assault, fraud, criminal breach of trust, offences
  against the person or property, and so on. Past or alleged conduct.
- adjacent: a genuine legal matter that is NOT criminal — purely civil,
  family, contractual, consumer, service, tax or constitutional. Name what
  kind of matter it is and say the service covers criminal matters.
- out_of_scope: not a legal question at all.
- needs_human: the person describes immediate danger, ongoing violence
  against them, or risk of self-harm. Choose this over in_scope whenever
  safety is live, even if a criminal offence is also described.
- unsafe: the person is seeking help to commit a future offence, conceal one,
  destroy evidence, or intimidate a witness. Describing an offence that has
  already happened is NOT unsafe — that is in_scope.

`reason` is one sentence addressed to the user. `suggestion` is a concrete
next step when the decision is not in_scope; leave it empty when it is.
Set `welfare_flag` true whenever anyone in the narrative appears to be at
immediate risk."""
)


def _prefilter(text: str) -> Optional[GuardResult]:
    """Deterministic checks that run before spending a token."""
    stripped = (text or "").strip()
    if len(stripped.split()) < _MIN_WORDS:
        return GuardResult(
            decision=ScopeDecision.OUT_OF_SCOPE,
            reason="There isn't enough here to argue yet.",
            suggestion="Describe what happened, roughly when, and who was "
                       f"involved. {_EXAMPLE}",
        )
    welfare = any(p.search(stripped) for p in _WELFARE_PATTERNS)
    if any(p.search(stripped) for p in _PLANNING_PATTERNS):
        return GuardResult(
            decision=ScopeDecision.UNSAFE,
            reason="This reads as a request to help plan or conceal an offence.",
            suggestion="If you are describing something that has already "
                       "happened, say so plainly and both sides will argue it.",
            welfare=welfare,
            helplines=HELPLINES if welfare else [],
        )
    return None


async def screen(
    text: str, *, ledger: Optional[TokenLedger] = None
) -> GuardResult:
    """Screen a case description. Never raises on classification."""
    signals = prompting.scan_for_injection(text)
    pii = prompting.pii_kinds(text)
    if signals:
        log.warning("guard.injection_signals",
                    extra={"signals": signals, "preview": prompting.preview(text)})

    early = _prefilter(text)
    if early is not None:
        early.injection_signals = signals
        early.pii_kinds = pii
        log.info("guard.prefiltered", extra={"decision": early.decision.value})
        return early

    prompt = (
        "Screen the following submission.\n\n"
        + prompting.fence(text, "SUBMISSION")
    )
    try:
        assessment = await llm.generate(
            prompt,
            ScopeAssessment,
            step="guard.scope",
            tier=FAST,
            system=_SYSTEM,
            temperature=0.0,
            ledger=ledger,
        )
    except Exception as exc:
        # Fail open to in_scope rather than block a legitimate user on an
        # upstream fault; the deterministic pre-filter has already run and the
        # debate itself is not a privileged operation.
        log.error("guard.classifier_failed", extra={"error": str(exc)[:200]})
        return GuardResult(decision=ScopeDecision.IN_SCOPE,
                           injection_signals=signals, pii_kinds=pii)

    welfare = assessment.welfare_flag or any(p.search(text) for p in _WELFARE_PATTERNS)
    decision = assessment.decision
    if welfare and decision in (ScopeDecision.IN_SCOPE, ScopeDecision.ADJACENT):
        decision = ScopeDecision.NEEDS_HUMAN

    result = GuardResult(
        decision=decision,
        reason=assessment.reason,
        suggestion=assessment.suggestion or (
            _EXAMPLE if decision == ScopeDecision.OUT_OF_SCOPE else ""
        ),
        welfare=welfare,
        helplines=HELPLINES if welfare else [],
        injection_signals=signals,
        pii_kinds=pii,
    )
    log.info("guard.decision", extra={"decision": result.decision.value,
                                      "welfare": welfare,
                                      "injection": bool(signals)})
    return result
