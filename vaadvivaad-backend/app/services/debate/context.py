"""Context assembly and the claim ledger.

There was no context management at all: `debate_history` was accumulated for
the transcript but never fed back into a prompt, so each turn saw only the
single preceding argument. A debate that cannot reference anything earlier
cannot concede, cannot build, and repeats itself.

Four tiers are assembled per turn, with an explicit drop order under pressure:

  1. immutable case context  — case object, statute, precedent shortlist
  2. rolling claim ledger    — who claimed what, and whether it was answered
  3. recent verbatim         — the last two turns, exactly as written
  4. turn instruction        — persona, phase, schema, the point being answered

Tier 1 is byte-identical across every turn of a debate, which is what makes
it worth caching provider-side; the old code rebuilt and re-sent an even
larger version of it on every call.

Compaction produces a claim ledger rather than a prose summary, because in a
debate what matters is not what was said but what was *answered* — and a
prose summary loses exactly that.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Sequence

from app.core.logging import get_logger
from app.domain.schemas import (
    ArgumentTurn,
    CaseStructure,
    Claim,
    ClaimStatus,
    Phase,
    Precedent,
    SectionReference,
    Side,
    TurnRecord,
)
from app.services import citations as citation_service

log = get_logger(__name__)

# Rough token estimate. Deliberately cheap: an exact count would need a
# tokenizer round trip per assembly, and the budget only needs to be right to
# within a few percent to make the right drop decisions.
_CHARS_PER_TOKEN = 3.8


def estimate_tokens(text: str) -> int:
    return int(len(text or "") / _CHARS_PER_TOKEN) + 1


@dataclass
class ClaimLedger:
    """Structured record of the argument, not a transcript."""

    claims: List[Claim] = field(default_factory=list)
    _counter: int = 0

    def next_id(self, side: Side) -> str:
        self._counter += 1
        return f"{'P' if side is Side.PROSECUTION else 'D'}{self._counter}"

    def by_id(self, claim_id: str) -> Optional[Claim]:
        return next((c for c in self.claims if c.id == claim_id), None)

    def record(self, turn: ArgumentTurn, side: Side, round_no: int) -> Claim:
        """Add this turn's claim and apply its effects on existing claims."""
        for answered_id in turn.answers_claims:
            target = self.by_id(answered_id)
            if target and target.side is not side and target.status is ClaimStatus.STANDING:
                target.status = ClaimStatus.CONTESTED
                target.last_touched_round = round_no

        for conceded_id in turn.concedes_claims:
            target = self.by_id(conceded_id)
            # A side may only concede its *own* claim. Letting counsel mark an
            # opponent's claim conceded would let one side end the debate by
            # assertion.
            if target and target.side is side:
                target.status = ClaimStatus.CONCEDED
                target.last_touched_round = round_no

        claim = Claim(
            id=self.next_id(side),
            side=side,
            text=turn.headline.strip() or turn.argument[:160],
            citations=list(turn.relies_on),
            status=ClaimStatus.STANDING,
            raised_round=round_no,
            last_touched_round=round_no,
            answered_by=[],
        )
        for answered_id in turn.answers_claims:
            target = self.by_id(answered_id)
            if target:
                target.answered_by.append(claim.id)
        self.claims.append(claim)
        return claim

    def open_claims(self, against: Side) -> List[Claim]:
        """Opponent claims still unanswered — what this side must deal with."""
        return [
            c for c in self.claims
            if c.side is not against and c.status is ClaimStatus.STANDING
        ]

    def render(self, max_tokens: int = 600) -> str:
        """Compact rendering, newest first, truncated to a token budget.

        Resolved claims are dropped before live ones: a conceded point needs
        no further argument, while a standing one is the whole reason the
        next turn exists.
        """
        if not self.claims:
            return ""

        def priority(claim: Claim) -> tuple:
            rank = {ClaimStatus.STANDING: 0, ClaimStatus.CONTESTED: 1,
                    ClaimStatus.CONCEDED: 2}[claim.status]
            return (rank, -claim.last_touched_round)

        lines: List[str] = []
        used = 0
        for claim in sorted(self.claims, key=priority):
            marker = {"standing": "OPEN", "contested": "CONTESTED",
                      "conceded": "CONCEDED"}[claim.status.value]
            cites = f" [{', '.join(claim.citations)}]" if claim.citations else ""
            line = (f"  {claim.id} ({claim.side.value}, r{claim.raised_round}, "
                    f"{marker}): {claim.text}{cites}")
            cost = estimate_tokens(line)
            if used + cost > max_tokens:
                lines.append(f"  … {len(self.claims) - len(lines)} earlier claims omitted")
                break
            lines.append(line)
            used += cost
        return "Claim ledger:\n" + "\n".join(lines)

    def to_dicts(self) -> List[dict]:
        return [c.model_dump(mode="json") for c in self.claims]

    @classmethod
    def from_dicts(cls, raw: Sequence[dict]) -> "ClaimLedger":
        ledger = cls(claims=[Claim.model_validate(item) for item in raw])
        highest = 0
        for claim in ledger.claims:
            match = re.match(r"[PD](\d+)$", claim.id)
            if match:
                highest = max(highest, int(match.group(1)))
        ledger._counter = highest
        return ledger


@dataclass
class DebateContext:
    """Everything a turn needs, assembled in tiers."""

    case: CaseStructure
    statute: Optional[SectionReference]
    precedents: List[Precedent]
    sections: List[str] = field(default_factory=list)
    code: str = "IPC"
    ledger: ClaimLedger = field(default_factory=ClaimLedger)
    recent: List[TurnRecord] = field(default_factory=list)
    user_evidence: str = ""
    # Passages retrieved from the user's own uploaded documents for the phase
    # being argued. Refreshed per turn by the machine, not cached in the
    # immutable block: what matters during the evidence phase is not what
    # matters in rebuttal.
    file_passages: List[dict] = field(default_factory=list)
    # Conflicts found in the case file. Put to both sides, not only the
    # defence: the prosecution has to be able to explain a discrepancy it is
    # going to be confronted with, and a hearing where only one side can see
    # the problem is not a test of the case.
    contradictions: List[dict] = field(default_factory=list)

    _immutable_cache: Optional[str] = None

    # ── Tier 1 ───────────────────────────────────────────────────────────

    def immutable_block(self) -> str:
        """Built once per debate and reused verbatim.

        Cached on the instance so it is stable byte-for-byte across turns,
        which is the precondition for provider-side context caching being
        able to do anything for us.
        """
        if self._immutable_cache is not None:
            return self._immutable_cache

        parts = ["## CASE", f"Summary: {self.case.summary}"]
        if self.case.incident_date:
            parts.append(f"Date of incident: {self.case.incident_date}")
        if self.case.location:
            parts.append(f"Location: {self.case.location}")
        if self.case.parties:
            parts.append("Parties: " + "; ".join(
                f"{p.role}{' — ' + p.name if p.name else ''}" for p in self.case.parties))
        if self.case.disputed_facts:
            parts.append("Disputed: " + "; ".join(self.case.disputed_facts))

        # The user's own evidence. Previously accepted by the form, stored,
        # and then never read — the debate argued over a generic
        # "typical evidence for this section" list instead.
        if self.case.evidence:
            parts.append("\n## EVIDENCE ON THE RECORD")
            for item in self.case.evidence:
                held = "in possession" if item.in_possession else "referred to"
                kind = f", {item.kind}" if item.kind else ""
                parts.append(f"  - {item.description} ({held}{kind})")
        elif self.user_evidence:
            parts.append("\n## EVIDENCE ON THE RECORD\n" + self.user_evidence)
        else:
            parts.append("\n## EVIDENCE ON THE RECORD\n  (none stated)")

        if self.statute:
            parts.append("\n## STATUTE\n" + self.statute.for_prompt())
        elif self.sections:
            parts.append(f"\n## STATUTE\nSection(s) in issue: "
                         f"{', '.join(self.sections)} ({self.code}). "
                         "Full statutory text was not available; argue from the "
                         "elements as generally understood and say so if a "
                         "point turns on precise wording.")

        parts.append("\n## AUTHORITIES\n" + citation_service.citation_block(self.precedents))
        self._immutable_cache = "\n".join(parts)
        return self._immutable_cache

    # ── Tiers 2–4 ────────────────────────────────────────────────────────

    def assemble(
        self,
        side: Side,
        phase: Phase,
        round_no: int,
        instruction: str,
        *,
        ledger_budget: int = 600,
        verbatim_budget: int = 800,
    ) -> str:
        """Build the full prompt for one turn, dropping tiers under pressure."""
        blocks = [self.immutable_block()]

        ledger_text = self.ledger.render(max_tokens=ledger_budget)
        if ledger_text:
            blocks.append("\n## STATE OF THE ARGUMENT\n" + ledger_text)

        open_against = self.ledger.open_claims(against=side)
        if open_against:
            blocks.append(
                "\n## UNANSWERED BY YOUR SIDE\n"
                + "\n".join(f"  {c.id}: {c.text}" for c in open_against[:5])
            )

        # The case file, before the immediate exchange: counsel should reach
        # for the document before reaching for the last thing said.
        if self.file_passages:
            from app.services import casefile

            rendered = casefile.render_passages(self.file_passages)
            if rendered:
                blocks.append(
                    "\n## FROM THE CASE FILE\n"
                    "Passages from documents filed in this matter. Quote them "
                    "with their [source#n] anchor so the reference can be "
                    "checked.\n\n" + rendered
                )

        if self.contradictions:
            lines = []
            for item in self.contradictions[:4]:
                mark = "" if item.get("certain") else " (provisional)"
                lines.append(
                    f"- {item.get('why', '')}{mark}\n"
                    f"    A [{item.get('anchor_a', '')}]: {item.get('statement_a', '')}\n"
                    f"    B [{item.get('anchor_b', '')}]: {item.get('statement_b', '')}"
                )
            blocks.append(
                "\n## DISCREPANCIES IN THE FILE\n"
                "Found by comparing documents in this matter. Anything marked "
                "provisional was read out of the text and may be explicable — "
                "address it, do not assume it.\n" + "\n".join(lines)
            )

        verbatim = self._recent_verbatim(verbatim_budget)
        if verbatim:
            blocks.append("\n## IMMEDIATELY PRECEDING\n" + verbatim)

        blocks.append(f"\n## YOUR TURN\nRound {round_no}, {phase.value} phase.\n{instruction}")
        return "\n".join(blocks)

    def _recent_verbatim(self, budget: int) -> str:
        """The last two turns in full — the current exchange must be exact.

        Summarising the turn you are answering is how a debate starts talking
        past itself.
        """
        out: List[str] = []
        used = 0
        for record in reversed(self.recent[-2:]):
            text = (f"[{record.side.value}, round {record.round}] "
                    f"{record.content.headline}\n{record.content.argument}")
            cost = estimate_tokens(text)
            if used + cost > budget:
                break
            out.insert(0, text)
            used += cost
        return "\n\n".join(out)

    def add_turn(self, record: TurnRecord) -> Claim:
        claim = self.ledger.record(record.content, record.side, record.round)
        self.recent.append(record)
        # Only the tail is ever rendered; keeping more just grows memory.
        self.recent = self.recent[-4:]
        return claim

    def budget_report(self) -> Dict[str, int]:
        return {
            "immutable_tokens": estimate_tokens(self.immutable_block()),
            "ledger_tokens": estimate_tokens(self.ledger.render()),
            "claims": len(self.ledger.claims),
            "precedents": len(self.precedents),
        }
