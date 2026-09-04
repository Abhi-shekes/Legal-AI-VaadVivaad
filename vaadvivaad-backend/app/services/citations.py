"""Citation verification.

The trust direction is inverted here. Counsel may only cite from the
shortlist of documents actually retrieved for this case, and every citation
in a generated turn is checked against that shortlist *before* the turn is
emitted. Anything unmatched is stripped from the argument and reported, so
the UI can mark the turn rather than show a fabricated authority as fact.

This is what makes an injected "cite Sharma v. State" harmless: persuading
the model costs the attacker nothing, but the citation still has to exist in
the shortlist, and it does not.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, Iterable, List, Sequence, Tuple

from app.core import metrics
from app.core.logging import get_logger
from app.domain.schemas import ArgumentTurn, Precedent

log = get_logger(__name__)

# A case-name-shaped phrase in free prose: "X v. Y" / "X vs Y".
_CASE_NAME_IN_PROSE = re.compile(
    r"\b([A-Z][\w.'’-]*(?:\s+[A-Z][\w.'’-]*){0,5})\s+"
    r"(?:v\.?|vs\.?|versus)\s+"
    r"([A-Z][\w.'’-]*(?:\s+[A-Z][\w.'’-]*){0,5})", re.UNICODE)

# Abbreviations whose full stop does NOT end a sentence. Without this, a
# naive split on "." tears "Gurmit Singh v. State of Punjab" in half and the
# case name never survives as one unit to be checked.
_ABBREVIATIONS = (
    "v|vs|ors|anr|anrs|etc|sec|secs|no|nos|ltd|pvt|co|govt|hon|hon'ble|"
    "smt|shri|sri|dr|mr|mrs|ms|prof|j|jj|cri|lj|air|scc|scr|ilr|art|arts|cl|para"
)
_PROTECT_ABBREV = re.compile(r"\b(" + _ABBREVIATIONS + r")\.", re.I)
_PROTECT_INITIAL = re.compile(r"\b([A-Z])\.")
_DOT = "\x00"


def split_sentences(text: str) -> List[str]:
    """Split prose into sentences without breaking on legal abbreviations."""
    protected = _PROTECT_ABBREV.sub(lambda m: m.group(1) + _DOT, text or "")
    protected = _PROTECT_INITIAL.sub(lambda m: m.group(1) + _DOT, protected)
    return [part.replace(_DOT, ".") for part in re.split(r"(?<=[.!?])\s+", protected)]


# Reporter-style citations, e.g. "(2003) 5 SCC 746", "AIR 1996 SC 1393".
_REPORTER = re.compile(
    r"\(?\b(1[89]\d{2}|20\d{2})\)?\s+\d+\s+(SCC|SCR|AIR|Cri\.?\s?L\.?J\.?|SCALE)\b|"
    r"\bAIR\s+(1[89]\d{2}|20\d{2})\s+[A-Z]{2,4}\s+\d+\b", re.I)


@dataclass
class VerificationResult:
    turn: ArgumentTurn
    verified_ids: List[str] = field(default_factory=list)
    unsupported_ids: List[str] = field(default_factory=list)
    # Case names that appear in the prose but match nothing in the shortlist.
    unsupported_names: List[str] = field(default_factory=list)
    redacted: bool = False

    @property
    def clean(self) -> bool:
        return not self.unsupported_ids and not self.unsupported_names


def _known_names(precedents: Sequence[Precedent]) -> List[str]:
    return [p.case_name.lower() for p in precedents if p.case_name]


def _name_is_known(candidate: str, known: Iterable[str]) -> bool:
    """Loose containment either way — retrieved names carry citations and
    honorifics that a generated mention will not reproduce verbatim."""
    needle = " ".join(candidate.lower().split())
    if len(needle) < 6:
        return True  # too short to be a meaningful claim of authority
    for name in known:
        if needle in name or name in needle:
            return True
        # Compare surname tokens, which is what actually identifies a case.
        needle_tokens = {t for t in re.findall(r"\w+", needle) if len(t) > 3}
        name_tokens = {t for t in re.findall(r"\w+", name) if len(t) > 3}
        if needle_tokens and len(needle_tokens & name_tokens) >= max(2, len(needle_tokens) // 2):
            return True
    return False


def strip_unsupported_prose(text: str, precedents: Sequence[Precedent]) -> Tuple[str, List[str]]:
    """Remove sentences that rest on an authority we cannot vouch for.

    A whole sentence goes, not just the case name: "As held in *Fictional v.
    State*, mens rea is presumed" is not salvaged by deleting the citation —
    the proposition was resting on it.
    """
    known = _known_names(precedents)
    offenders: List[str] = []

    sentences = split_sentences(text or "")
    kept: List[str] = []
    for sentence in sentences:
        bad = False
        for match in _CASE_NAME_IN_PROSE.finditer(sentence):
            full = f"{match.group(1)} v. {match.group(2)}"
            if not _name_is_known(full, known):
                offenders.append(full)
                bad = True
        if not bad:
            reporter = _REPORTER.search(sentence)
            # A reporter citation is only acceptable in a sentence that also
            # names an authority from the shortlist; otherwise it is a
            # fabricated pin-cite even though no party names were given.
            if reporter and not any(
                _name_is_known(m.group(0), known)
                for m in _CASE_NAME_IN_PROSE.finditer(sentence)
            ):
                offenders.append(reporter.group(0).strip())
                bad = True
        if not bad:
            kept.append(sentence)

    cleaned = " ".join(s for s in kept if s.strip()).strip()
    return cleaned, offenders


def verify_turn(turn: ArgumentTurn, precedents: Sequence[Precedent]) -> VerificationResult:
    """Check a generated turn against the retrieved shortlist."""
    allowed: Dict[str, Precedent] = {
        p.citation_id: p for p in precedents if p.citation_id and p.verified
    }

    verified = [cid for cid in turn.relies_on if cid in allowed]
    unsupported = [cid for cid in turn.relies_on if cid not in allowed]

    cleaned_text, prose_offenders = strip_unsupported_prose(turn.argument, precedents)
    redacted = cleaned_text != (turn.argument or "").strip()

    if not cleaned_text:
        # Everything rested on invented authority. Keep the headline so the
        # turn is not empty, and let the caller mark it.
        cleaned_text = turn.headline

    safe_turn = turn.model_copy(update={
        "argument": cleaned_text,
        "relies_on": verified,
    })

    metrics.inc("vaadvivaad_citations_total", len(verified), status="verified")
    if unsupported or prose_offenders:
        metrics.inc("vaadvivaad_citations_total",
                    len(unsupported) + len(prose_offenders), status="stripped")
        log.warning(
            "citations.unsupported",
            extra={"ids": unsupported[:5], "names": prose_offenders[:5],
                   "allowed": len(allowed)},
        )

    return VerificationResult(
        turn=safe_turn,
        verified_ids=verified,
        unsupported_ids=unsupported,
        unsupported_names=prose_offenders,
        redacted=redacted,
    )


def citation_block(precedents: Sequence[Precedent]) -> str:
    """Render the only authorities counsel is permitted to cite."""
    usable = [p for p in precedents if p.verified and p.citation_id]
    if not usable:
        return (
            "NO PRECEDENT AVAILABLE. The corpus returned nothing for this "
            "matter. Argue from the statutory text and the facts alone. Do "
            "NOT name, cite, or allude to any judgment — not even one you are "
            "confident exists. Saying that no authority was located is "
            "correct and expected."
        )
    lines = ["You may cite ONLY these judgments, by their bracketed id:"]
    lines += [f"  {p.for_prompt()}" for p in usable]
    lines.append(
        "Put the ids you actually rely on in `relies_on`. Citing anything "
        "outside this list is a factual error."
    )
    return "\n".join(lines)
