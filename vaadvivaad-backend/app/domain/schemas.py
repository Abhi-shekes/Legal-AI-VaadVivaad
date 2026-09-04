"""Structured contracts for every model call.

These double as Gemini `response_schema` values, which is what removes the
old markdown-fence stripping and `json.loads` salvage path: the model is
constrained to emit conforming JSON rather than asked nicely to.

Kept deliberately flat and free of `Optional[...]`-heavy nesting — the
structured-output decoder handles simple object/array/enum shapes far more
reliably than deep unions.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Guard / intake ───────────────────────────────────────────────────────

class ScopeDecision(str, Enum):
    IN_SCOPE = "in_scope"          # Indian criminal matter — proceed
    ADJACENT = "adjacent"          # civil/family/consumer — explain the boundary
    OUT_OF_SCOPE = "out_of_scope"  # not legal at all — redirect
    NEEDS_HUMAN = "needs_human"    # distress / immediate danger — refer first
    UNSAFE = "unsafe"              # seeking help to commit or conceal


class ScopeAssessment(BaseModel):
    """Replaces the single non-legal boolean, which was a dead end for users."""

    decision: ScopeDecision
    reason: str = Field(description="One sentence, shown to the user.")
    suggestion: str = Field(
        default="",
        description="Concrete next step when not in scope. Empty when in scope.",
    )
    # Set when the description suggests ongoing danger or self-harm risk, so
    # the caller can surface helplines before anything else runs.
    welfare_flag: bool = False


class Party(BaseModel):
    role: str = Field(description="e.g. complainant, accused, witness, investigating officer")
    name: str = ""
    detail: str = ""


class EvidenceItem(BaseModel):
    description: str
    kind: str = Field(default="", description="documentary | material | testimonial | electronic | forensic")
    in_possession: bool = Field(
        default=False, description="True if the user says they already hold it."
    )


class CaseStructure(BaseModel):
    """The confirmed case object. Everything downstream reads this, not prose."""

    summary: str = Field(description="Neutral factual summary in formal language.")
    crime_type: str = Field(description="Short classification, e.g. 'theft', 'grievous hurt'.")
    incident_date: str = Field(
        default="",
        description="ISO YYYY-MM-DD if stated or inferable, else empty. Drives IPC vs BNS routing.",
    )
    location: str = ""
    parties: List[Party] = Field(default_factory=list)
    evidence: List[EvidenceItem] = Field(default_factory=list)
    disputed_facts: List[str] = Field(default_factory=list)
    user_position: str = Field(
        default="",
        description="Which side the user appears to be on, if stated: complainant | accused | neutral",
    )


class SectionCandidate(BaseModel):
    section: str = Field(description="Bare number or number+letter, e.g. '302', '304A'.")
    code: str = Field(default="IPC", description="IPC | BNS")
    title: str = ""
    rationale: str = Field(description="Why the facts engage this section.")
    confidence: float = Field(ge=0.0, le=1.0)


class SectionCandidates(BaseModel):
    """All plausible sections, ranked — the old code hard-coded `[0]` and
    silently dropped every other offence disclosed by the same facts."""

    candidates: List[SectionCandidate]


# ── Statute reference ────────────────────────────────────────────────────

class OffenceElement(BaseModel):
    element: str
    description: str


class SectionReference(BaseModel):
    section: str
    code: str = ""
    definition: str = ""
    elements: List[OffenceElement] = Field(default_factory=list)
    mens_rea: str = ""
    proof_requirement: str = ""
    punishment: str = ""
    cognizable: Optional[bool] = None
    bailable: Optional[bool] = None
    defences: List[str] = Field(default_factory=list)

    def for_prompt(self) -> str:
        """Compact projection used in argument prompts.

        The old code interpolated the entire `full_data` blob — procedural
        steps, challenges, landmark cases — into every turn. Counsel needs the
        elements, the mental element, the proof standard, the exposure and the
        available defences; the rest was pure token cost.
        """
        lines = [f"Section {self.section} ({self.code or 'IPC'})"]
        if self.definition:
            lines.append(f"Definition: {self.definition}")
        if self.elements:
            lines.append("Elements that must be proved:")
            lines += [f"  - {e.element}: {e.description}" for e in self.elements]
        if self.mens_rea:
            lines.append(f"Mental element: {self.mens_rea}")
        if self.proof_requirement:
            lines.append(f"Standard of proof: {self.proof_requirement}")
        if self.punishment:
            lines.append(f"Punishment: {self.punishment}")
        if self.defences:
            lines.append("Recognised defences: " + "; ".join(self.defences))
        return "\n".join(lines)


class EvidenceProfile(BaseModel):
    crime_type: str = ""
    section: str = ""
    typical_evidence: List[str] = Field(default_factory=list)
    categories: List[str] = Field(default_factory=list)


# ── Retrieved precedent ──────────────────────────────────────────────────

class Precedent(BaseModel):
    """A retrieved judgment. `citation_id` is the only thing counsel is
    permitted to cite — it is checked against the retrieved shortlist before
    a turn is emitted."""

    citation_id: str = Field(description="Stable corpus id, e.g. 'ik:1234567'.")
    case_name: str
    court: str = ""
    date: str = ""
    sections: List[str] = Field(default_factory=list)
    holding: str = ""
    summary: str = ""
    source_url: str = ""
    score: float = 0.0
    verified: bool = Field(
        default=False,
        description="True only for documents from the curated corpus.",
    )
    # Filled from the citation graph at retrieval time. Empty means nothing is
    # recorded, which is not the same as "good law" -- see services/authority.py.
    treatment: str = Field(
        default="",
        description="Most severe recorded treatment by a later judgment.",
    )
    treated_by: List[str] = Field(
        default_factory=list,
        description="Judgments that overruled, doubted or distinguished this one.",
    )
    cited_by: int = Field(
        default=0, description="How many corpus judgments cite this one."
    )

    def for_prompt(self) -> str:
        bits = [f"[{self.citation_id}] {self.case_name}"]
        if self.court or self.date:
            bits.append(f"({self.court}{', ' if self.court and self.date else ''}{self.date})")
        head = " ".join(bits)
        body = self.holding or self.summary
        out = f"{head}\n  Holding: {body}" if body else head
        # Counsel is told before they rely on it, not after. Phrased as a
        # caution rather than a prohibition: a distinguished authority is
        # still arguable, and saying why is often the argument.
        if self.treatment in ("overruled", "doubted"):
            by = ", ".join(self.treated_by[:2])
            out += (f"\n  CAUTION: later authority has {self.treatment} this"
                    + (f" ({by})" if by else "")
                    + ". Do not rely on it without addressing that.")
        elif self.treatment == "distinguished":
            out += "\n  Note: later authority has distinguished this on its facts."
        return out


# ── Debate ───────────────────────────────────────────────────────────────

class Side(str, Enum):
    PROSECUTION = "prosecution"
    DEFENCE = "defence"


class Phase(str, Enum):
    OPENING = "opening"
    EVIDENCE = "evidence"
    REBUTTAL = "rebuttal"
    CLOSING = "closing"
    # Heard after an order has been made, when the person whose matter it is
    # asks for the point to be argued further. The bench then rules again on
    # the fuller record.
    FURTHER = "further submissions"


class ClaimStatus(str, Enum):
    STANDING = "standing"    # raised, not yet answered
    CONTESTED = "contested"  # answered, still live
    CONCEDED = "conceded"    # abandoned or accepted


class Claim(BaseModel):
    """One entry in the claim ledger.

    Compacting a debate as prose loses the only thing that matters — what was
    *answered*. The ledger keeps that machine-checkable, compresses harder
    than a summary, and is exactly what the Bench needs at the end.
    """

    id: str
    side: Side
    text: str
    citations: List[str] = Field(default_factory=list)
    status: ClaimStatus = ClaimStatus.STANDING
    raised_round: int = 0
    last_touched_round: int = 0
    answered_by: List[str] = Field(default_factory=list)


class ArgumentTurn(BaseModel):
    """What one counsel says in one turn."""

    headline: str = Field(description="One sentence stating the point being made.")
    argument: str = Field(description="The argument in 2-4 sentences of court-appropriate prose.")
    relies_on: List[str] = Field(
        default_factory=list,
        description="citation_id values from the supplied precedent list ONLY.",
    )
    element_addressed: str = Field(
        default="", description="Which element of the offence this speaks to."
    )
    answers_claims: List[str] = Field(
        default_factory=list, description="Claim ids from the opponent this rebuts."
    )
    concedes_claims: List[str] = Field(
        default_factory=list, description="Claim ids this turn accepts."
    )
    relief_sought: str = ""


class TurnRecord(BaseModel):
    """A persisted turn. Written the moment it completes, so a debate resumes
    from the last committed turn rather than restarting."""

    index: int
    round: int
    phase: Phase
    side: Side
    content: ArgumentTurn
    unsupported_citations: List[str] = Field(
        default_factory=list,
        description="Citations the model produced that were not in the shortlist.",
    )
    created_at: datetime = Field(default_factory=utcnow)
    tokens: int = 0


# ── The Bench ────────────────────────────────────────────────────────────

class IssueFinding(BaseModel):
    issue: str
    resolution: str
    favoured: Side


class BenchRuling(BaseModel):
    """The judgment. This is what turns a transcript into an answer."""

    decisive_issue: str = Field(description="The single issue the matter turns on.")
    findings: List[IssueFinding] = Field(default_factory=list)
    surviving_arguments: List[str] = Field(default_factory=list)
    abandoned_arguments: List[str] = Field(default_factory=list)
    disposition: str = Field(description="The order, in the language a court would use.")
    favoured_side: Side
    confidence: float = Field(
        ge=0.0, le=1.0, description="How firmly the record supports this disposition."
    )
    would_change_if: List[str] = Field(
        default_factory=list,
        description="Specific facts or evidence that would flip the result.",
    )
    reasoning: str = ""
    revises: int = Field(
        default=0,
        description="How many earlier orders this one supersedes. 0 for a first order.",
    )
    revision_note: str = Field(
        default="",
        description="What the further submissions changed, when this revises an order.",
    )


class Consultation(BaseModel):
    """A question put after the order, and the answer given.

    Kept as a record rather than a chat log: who was asked, what was asked,
    what came back, and -- for the bench -- whether the answer would disturb
    the order that was made.
    """

    role: str = Field(description="bench | prosecution | defence")
    question: str
    answer: str
    basis: List[str] = Field(
        default_factory=list,
        description="What in the record the answer rests on.",
    )
    changes_outcome: bool = Field(
        default=False,
        description="Bench only: whether this would disturb the order made.",
    )
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    relies_on: List[str] = Field(
        default_factory=list,
        description="Counsel only: citation ids, checked against the shortlist.",
    )
    asked_at: datetime = Field(default_factory=utcnow)


class BenchAnswer(BaseModel):
    """The bench's answer to a question put after the order."""

    answer: str = Field(description="The answer, in the language a court would use.")
    basis: List[str] = Field(
        default_factory=list,
        description="The findings or evidence the answer rests on.",
    )
    changes_outcome: bool = Field(
        description="True only if this would actually disturb the order made.",
    )
    confidence: float = Field(ge=0.0, le=1.0)


class CounselAnswer(BaseModel):
    """Counsel answering a question from the person whose matter it is."""

    answer: str = Field(description="The answer, arguing from your side's position.")
    relies_on: List[str] = Field(
        default_factory=list,
        description="Citation ids from the shortlist only. Never invent one.",
    )
    caveat: str = Field(
        default="",
        description="Anything the record does not let you say.",
    )


# ── Evidence gaps & strength ─────────────────────────────────────────────

class EvidenceGap(BaseModel):
    element: str = Field(description="The element of the offence left unproved.")
    missing: str = Field(description="What is absent from the record.")
    obtain_how: str = Field(description="How this evidence is ordinarily obtained.")
    obtain_who: str = Field(default="", description="Who can obtain it.")
    provision: str = Field(default="", description="Procedural provision, where applicable.")
    severity: str = Field(default="material", description="critical | material | minor")
    exploited_in_debate: bool = Field(
        default=False, description="True if the defence actually leaned on this."
    )


class EvidenceGapReport(BaseModel):
    gaps: List[EvidenceGap] = Field(default_factory=list)
    strongest_point: str = ""
    weakest_point: str = ""


class StrengthFactor(BaseModel):
    factor: str
    weight: float = Field(ge=0.0, le=1.0)
    score: float = Field(ge=0.0, le=1.0)
    note: str = ""


class StrengthAssessment(BaseModel):
    """Decomposed on purpose: a bare number from a model is not evidence of
    anything, and is never shown without the factors that produced it."""

    prosecution_score: float = Field(ge=0.0, le=1.0)
    defence_score: float = Field(ge=0.0, le=1.0)
    factors: List[StrengthFactor] = Field(default_factory=list)
    sensitivity: List[str] = Field(
        default_factory=list,
        description="e.g. 'securing the CCTV moves prosecution 0.42 -> 0.61'",
    )
    caveat: str = ""


# ── Coaching (take-a-side mode) ──────────────────────────────────────────

class ArgumentScore(BaseModel):
    legal_accuracy: float = Field(ge=0.0, le=1.0)
    use_of_precedent: float = Field(ge=0.0, le=1.0)
    responsiveness: float = Field(ge=0.0, le=1.0)
    procedural_form: float = Field(ge=0.0, le=1.0)
    overall: float = Field(ge=0.0, le=1.0)
    strengths: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)
    model_answer: str = Field(default="", description="How counsel might have put it.")


# ── Translation ──────────────────────────────────────────────────────────

class Translation(BaseModel):
    text: str = Field(
        description="Translated text. Section numbers, case citations and "
                    "terms of art stay in their canonical English form."
    )


__all__ = [n for n in dir() if n[0].isupper()] + ["utcnow"]


# ── Timeline and contradictions (F-07) ───────────────────────────────────

class TimelineEvent(BaseModel):
    """One dated thing that happened, anchored to where it was read.

    `source` and `anchor` are not optional in spirit: an event nobody can
    trace back to a document is an assertion, and this file does not deal in
    assertions.
    """

    date: str = Field(default="", description="ISO YYYY-MM-DD if stated, else empty.")
    time: str = Field(default="", description="24h HH:MM if stated, else empty.")
    kind: str = Field(
        default="other",
        description="incident | complaint | fir | arrest | seizure | recovery | "
                    "medical | statement | bail | charge | hearing | other",
    )
    description: str = Field(description="What happened, in the document's own terms.")
    actor: str = Field(default="", description="Who did it, if stated.")
    place: str = Field(default="", description="Where, if stated.")
    source: str = Field(default="", description="Filename the event was read from.")
    anchor: str = Field(default="", description="Passage anchor, e.g. 'fir.pdf#2'.")


class Contradiction(BaseModel):
    """Two statements in the file that cannot both be right."""

    kind: str = Field(
        default="conflict",
        description="chronology | date_conflict | place_conflict | account_conflict",
    )
    statement_a: str
    statement_b: str
    anchor_a: str = Field(default="", description="Where A was read from.")
    anchor_b: str = Field(default="", description="Where B was read from.")
    why: str = Field(description="Why the two cannot both hold.")
    # Rule-derived findings are arithmetic and are marked as certain; anything
    # a model proposed is marked provisional and says so in the UI.
    certain: bool = Field(
        default=False,
        description="True only for deterministically derived conflicts.",
    )


class TimelineReport(BaseModel):
    events: List[TimelineEvent] = Field(default_factory=list)
    contradictions: List[Contradiction] = Field(default_factory=list)
    note: str = ""

