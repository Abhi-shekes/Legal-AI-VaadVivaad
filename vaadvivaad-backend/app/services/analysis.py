"""Post-debate analysis: evidence gaps, case strength, and coaching.

Features 06, 09 and 07 of the plan. All three read the *structured* debate
outcome — the claim ledger and the Bench's ruling — rather than asking a
model to re-read the transcript and produce a number, which is how you get a
confident figure that means nothing.
"""

from __future__ import annotations

from typing import List, Optional, Sequence

from app.core.llm import FAST, REASONING, TokenLedger, llm
from app.core.logging import get_logger
from app.domain.schemas import (
    ArgumentScore,
    BenchRuling,
    CaseStructure,
    Claim,
    ClaimStatus,
    EvidenceGapReport,
    Precedent,
    SectionReference,
    Side,
    StrengthAssessment,
    StrengthFactor,
)
from app.security import prompting
from app.services.debate.context import ClaimLedger

log = get_logger(__name__)

_GAPS_SYSTEM = prompting.system_prompt(
    """You audit an Indian criminal case for evidentiary gaps.

For each element of the offence that the record does not establish, say what
is missing, how that class of evidence is ordinarily obtained, and who can
obtain it. Where a procedural provision governs the step (a BNSS provision
for a search, a summons, a medical examination), name it — but only if you
are confident; leave it empty rather than inventing a section number.

Rank by `severity`: critical (the case fails without it), material (it
materially weakens the case), minor. Set `exploited_in_debate` true where the
defence actually attacked that gap during the hearing.

Do not invent evidence that exists. You are listing what is ABSENT."""
)

_STRENGTH_SYSTEM = prompting.system_prompt(
    """You assess how strongly a record supports each side in an Indian
criminal matter.

Score from the state of the record, not the fluency of the advocacy. Decompose
into named factors with explicit weights, and make `sensitivity` concrete:
name the specific evidence and the numeric shift it would cause.

A thin record scores low for BOTH sides. Prosecution and defence scores are
independent assessments of each case's strength, not two halves of one."""
)

_COACH_SYSTEM = prompting.system_prompt(
    """You are a moot-court judge scoring an argument written by a law student
acting as counsel in an Indian criminal matter.

Score each criterion 0–1 and be exacting but constructive:
- legal_accuracy: is the law stated correctly?
- use_of_precedent: is authority used properly, and only authority that exists?
- responsiveness: does it answer the point actually made against them?
- procedural_form: is it framed as counsel would frame it to a court?

`model_answer` shows how counsel might have put the same point better, in two
or three sentences. Penalise any citation to a judgment not in the supplied
authorities list — inventing authority is the most serious fault available."""
)


async def evidence_gaps(
    case: CaseStructure,
    statute: Optional[SectionReference],
    ledger: ClaimLedger,
    *,
    tokens: Optional[TokenLedger] = None,
) -> EvidenceGapReport:
    """What the record does not prove, ranked by how hard the defence pushed.

    The transcript is the ranking signal: a gap the defence actually leaned on
    is a gap that will be leaned on again.
    """
    elements = "\n".join(f"  - {e.element}: {e.description}"
                         for e in (statute.elements if statute else [])) or "  (not available)"
    evidence = "\n".join(f"  - {item.description}"
                         f"{' (held)' if item.in_possession else ''}"
                         for item in case.evidence) or "  (none on the record)"
    defence_points = "\n".join(
        f"  - {c.text}" for c in ledger.claims if c.side is Side.DEFENCE
    ) or "  (none)"

    prompt = (
        f"## OFFENCE\nSection {statute.section if statute else 'unspecified'}\n\n"
        f"## ELEMENTS TO PROVE\n{elements}\n\n"
        f"## EVIDENCE ON THE RECORD\n{evidence}\n\n"
        f"## POINTS THE DEFENCE ACTUALLY PRESSED\n{defence_points}\n\n"
        "Identify the evidentiary gaps."
    )
    report = await llm.generate(
        prompt, EvidenceGapReport, step="analysis.gaps", tier=FAST,
        system=_GAPS_SYSTEM, temperature=0.2, ledger=tokens,
    )
    order = {"critical": 0, "material": 1, "minor": 2}
    report.gaps.sort(key=lambda g: (not g.exploited_in_debate,
                                    order.get(g.severity.lower(), 3)))
    log.info("analysis.gaps", extra={"count": len(report.gaps)})
    return report


def _ledger_signals(ledger: ClaimLedger) -> dict:
    """Deterministic features from the debate, computed not asked for."""
    def tally(side: Side) -> dict:
        mine = [c for c in ledger.claims if c.side is side]
        return {
            "raised": len(mine),
            "standing": sum(1 for c in mine if c.status is ClaimStatus.STANDING),
            "conceded": sum(1 for c in mine if c.status is ClaimStatus.CONCEDED),
            "with_authority": sum(1 for c in mine if c.citations),
        }
    return {"prosecution": tally(Side.PROSECUTION), "defence": tally(Side.DEFENCE)}


async def case_strength(
    case: CaseStructure,
    ruling: BenchRuling,
    ledger: ClaimLedger,
    gaps: EvidenceGapReport,
    precedents: Sequence[Precedent],
    *,
    tokens: Optional[TokenLedger] = None,
) -> StrengthAssessment:
    """Decomposed strength for each side.

    The model never emits a bare number in isolation: it is given the
    deterministic tallies from the ledger and must produce factors that
    explain the score, and the caller renders the decomposition alongside it.
    """
    signals = _ledger_signals(ledger)
    critical_gaps = [g for g in gaps.gaps if g.severity.lower() == "critical"]

    prompt = (
        f"## RULING\nDecisive issue: {ruling.decisive_issue}\n"
        f"Disposition: {ruling.disposition}\n"
        f"Favoured: {ruling.favoured_side.value} "
        f"(bench confidence {ruling.confidence:.2f})\n\n"
        f"## DEBATE TALLIES\n"
        f"Prosecution: {signals['prosecution']}\n"
        f"Defence: {signals['defence']}\n\n"
        f"## CRITICAL EVIDENCE GAPS\n"
        + ("\n".join(f"  - {g.element}: {g.missing}" for g in critical_gaps)
           or "  (none identified)")
        + f"\n\n## AUTHORITY AVAILABLE\n{len(precedents)} verified judgment(s) retrieved.\n\n"
        "Assess the strength of each side on this record."
    )
    assessment = await llm.generate(
        prompt, StrengthAssessment, step="analysis.strength", tier=FAST,
        system=_STRENGTH_SYSTEM, temperature=0.2, ledger=tokens,
    )

    if len(assessment.factors) < 3:
        # Never present a score with nothing behind it; synthesise the
        # decomposition from what we measured ourselves.
        # A single factor is not a decomposition. Rebuild it from what we
        # measured ourselves so the score is always shown with its workings.
        assessment.factors = [
            StrengthFactor(factor="Claims left standing", weight=0.4,
                           score=_ratio(signals["prosecution"]["standing"],
                                        signals["prosecution"]["raised"]),
                           note="Prosecution points the defence did not answer."),
            StrengthFactor(factor="Authority relied on", weight=0.3,
                           score=1.0 if precedents else 0.0,
                           note=f"{len(precedents)} verified judgment(s) available."),
            StrengthFactor(factor="Critical evidence gaps", weight=0.3,
                           score=0.0 if critical_gaps else 1.0,
                           note=f"{len(critical_gaps)} critical gap(s)."),
        ]

    if not precedents:
        assessment.caveat = (
            "No verified precedent was available for this matter, so this "
            "assessment rests on the statutory elements and the record alone. "
            + (assessment.caveat or "")
        ).strip()

    log.info("analysis.strength",
             extra={"prosecution": round(assessment.prosecution_score, 2),
                    "defence": round(assessment.defence_score, 2),
                    "factors": len(assessment.factors)})
    return assessment


def _ratio(numerator: int, denominator: int) -> float:
    return round(numerator / denominator, 3) if denominator else 0.0


async def score_user_argument(
    user_text: str,
    side: Side,
    case: CaseStructure,
    statute: Optional[SectionReference],
    precedents: Sequence[Precedent],
    opponent_point: str = "",
    *,
    tokens: Optional[TokenLedger] = None,
) -> ArgumentScore:
    """Score an argument the user wrote (take-a-side mode)."""
    from app.services import citations as citation_service

    prompt = (
        f"## MATTER\n{case.summary}\n\n"
        f"## SECTION\n{statute.for_prompt() if statute else 'not available'}\n\n"
        f"## AUTHORITIES\n{citation_service.citation_block(precedents)}\n\n"
        + (f"## THE POINT BEING ANSWERED\n{opponent_point}\n\n" if opponent_point else "")
        + f"## ARGUMENT SUBMITTED BY COUNSEL FOR THE {side.value.upper()}\n"
        + prompting.fence(user_text, "SUBMISSION")
        + "\n\nScore it."
    )
    score = await llm.generate(
        prompt, ArgumentScore, step="analysis.coach", tier=REASONING,
        system=_COACH_SYSTEM, temperature=0.2, think=True, ledger=tokens,
    )
    log.info("analysis.coach", extra={"overall": round(score.overall, 2),
                                      "side": side.value})
    return score
