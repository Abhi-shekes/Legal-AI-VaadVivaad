"""Timeline and contradictions across the case file.

`analysis.py` derives evidence gaps and case strength from the claim ledger —
what counsel *argued*. Nothing read the facts against each other. A file where
the FIR is timestamped before the incident it reports, or where a witness is
in two places at once, produced a perfectly confident hearing.

Two passes, and the split between them is the point:

**The deterministic pass** does the arithmetic. An FIR lodged before the
incident, a recovery before the arrest that produced it, the same event dated
differently in two documents — these are orderings, not opinions, and they
are found by comparing dates. Findings here are marked `certain` and need no
model at all.

**The model pass** reads for conflicts prose can hide: two witnesses placing
the same person in different towns, a statement that contradicts an earlier
one. A model is the only practical tool for that, so it is fenced hard —
every proposed contradiction must quote both statements and name the passage
anchors they came from, and anything whose anchors are not in the file is
dropped before it is returned. The model points at evidence; it does not get
to assert facts. Findings here are `certain=False` and the UI says
"provisional".

The intended upgrade is an NLI cross-encoder (`DeBERTa-v3-base-mnli` on TEI),
which is cheaper and more consistent than an LLM for entailment. It is not
here because it means a second model container, and the box this runs on is
already carrying one. `_model_contradictions` is the seam.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Dict, List, Optional, Sequence, Tuple

from app.core.llm import FAST, TokenLedger, llm
from app.core.logging import get_logger
from app.domain.schemas import (
    CaseStructure,
    Contradiction,
    TimelineEvent,
    TimelineReport,
)
from app.security import prompting

log = get_logger(__name__)

# Orderings that a criminal file cannot violate. Each entry is
# (earlier_kind, later_kind, why) — if the later one is dated before the
# earlier one, something is wrong with the file.
ORDERING_RULES: List[Tuple[str, str, str]] = [
    ("incident", "complaint",
     "a complaint cannot be made before the incident it reports"),
    ("incident", "fir",
     "an FIR cannot be registered before the incident it records"),
    ("incident", "arrest",
     "an arrest for an offence cannot precede the offence"),
    ("complaint", "fir",
     "an FIR follows the complaint that triggers it"),
    ("arrest", "recovery",
     "a recovery at the instance of the accused cannot precede the arrest"),
    ("incident", "medical",
     "a medical examination for injuries cannot precede the incident"),
    ("fir", "charge",
     "a chargesheet is filed on an FIR that already exists"),
]


def parse_date(value: str) -> Optional[date]:
    """ISO first, then the forms Indian legal documents actually use."""
    text = (value or "").strip()
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%d-%m-%Y",
                "%d %B %Y", "%d %b %Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    match = re.search(r"(\d{4})-(\d{2})-(\d{2})", text)
    if match:
        try:
            return date(*(int(g) for g in match.groups()))
        except ValueError:
            return None
    return None


def _when(event: TimelineEvent) -> Optional[Tuple[date, str]]:
    parsed = parse_date(event.date)
    return (parsed, event.time or "00:00") if parsed else None


def sort_events(events: Sequence[TimelineEvent]) -> List[TimelineEvent]:
    """Dated events in order; undated ones after, in the order given."""
    dated = [e for e in events if _when(e)]
    undated = [e for e in events if not _when(e)]
    return sorted(dated, key=_when) + undated


# ── deterministic pass ───────────────────────────────────────────────────

def find_ordering_conflicts(events: Sequence[TimelineEvent]) -> List[Contradiction]:
    """Impossible orderings. Arithmetic, so these are certain."""
    by_kind: Dict[str, List[TimelineEvent]] = {}
    for event in events:
        if _when(event):
            by_kind.setdefault(event.kind, []).append(event)

    found: List[Contradiction] = []
    for earlier_kind, later_kind, why in ORDERING_RULES:
        for earlier in by_kind.get(earlier_kind, []):
            for later in by_kind.get(later_kind, []):
                if _when(later) < _when(earlier):
                    found.append(Contradiction(
                        kind="chronology",
                        statement_a=f"{earlier.kind}: {earlier.description}"
                                    f" ({earlier.date})",
                        statement_b=f"{later.kind}: {later.description}"
                                    f" ({later.date})",
                        anchor_a=earlier.anchor,
                        anchor_b=later.anchor,
                        why=f"The {later_kind} is dated before the "
                            f"{earlier_kind} — {why}.",
                        certain=True,
                    ))
    return found


def find_date_conflicts(events: Sequence[TimelineEvent]) -> List[Contradiction]:
    """The same kind of event given two different dates.

    Two documents dating the incident differently is the single most common
    real defect in a case file, and it is pure comparison.
    """
    singular = {"incident", "fir", "arrest", "complaint"}
    by_kind: Dict[str, List[TimelineEvent]] = {}
    for event in events:
        if event.kind in singular and parse_date(event.date):
            by_kind.setdefault(event.kind, []).append(event)

    found: List[Contradiction] = []
    for kind, group in by_kind.items():
        seen: Dict[date, TimelineEvent] = {}
        for event in group:
            parsed = parse_date(event.date)
            first = seen.get(parsed)
            if first is None:
                # Compare against any different date already recorded.
                for other_date, other in seen.items():
                    if other_date != parsed:
                        found.append(Contradiction(
                            kind="date_conflict",
                            statement_a=f"{other.description} ({other.date})",
                            statement_b=f"{event.description} ({event.date})",
                            anchor_a=other.anchor,
                            anchor_b=event.anchor,
                            why=f"The {kind} is dated {other.date} in one place "
                                f"and {event.date} in another.",
                            certain=True,
                        ))
                        break
                seen[parsed] = event
    return found


# ── model pass ───────────────────────────────────────────────────────────

_EXTRACT_SYSTEM = prompting.system_prompt(
    """You extract a factual timeline from documents in a criminal case file.

Rules:
  * Record only what a document states. Never infer a date that is not there;
    leave it empty instead.
  * Every event must carry the `anchor` of the passage it came from, copied
    exactly from the [anchor] marker above that passage.
  * Use the document's own words in `description`. Do not characterise,
    summarise the significance, or draw conclusions.
  * `kind` must be one of: incident, complaint, fir, arrest, seizure,
    recovery, medical, statement, bail, charge, hearing, other."""
)

_CONTRADICTION_SYSTEM = prompting.system_prompt(
    """You find statements in a criminal case file that cannot both be true.

Rules:
  * Quote both statements verbatim and give the `anchor` of each.
  * Report a contradiction only where the two genuinely cannot both hold. Two
    accounts differing in detail, or one being vaguer than the other, is not
    a contradiction.
  * Do not report anything you cannot anchor to two passages in the material
    given. If you find nothing, return an empty list -- that is a valid and
    common answer.
  * You are identifying tension in the record, not deciding the case."""
)


async def extract_events(
    passages: Sequence[Dict], *, case: Optional[CaseStructure] = None,
    ledger: Optional[TokenLedger] = None,
) -> List[TimelineEvent]:
    """Pull dated events out of case-file passages."""
    from app.services import casefile

    rendered = casefile.render_passages(passages, budget=4000)
    if not rendered.strip():
        return []

    prompt = ("Extract every dated event from these passages.\n\n"
              + prompting.fence(rendered, "CASE_FILE"))
    try:
        report = await llm.generate(
            prompt, TimelineReport, step="timeline.extract", tier=FAST,
            system=_EXTRACT_SYSTEM, temperature=0.0, ledger=ledger,
        )
    except Exception as exc:
        log.warning("timeline.extract_failed", extra={"error": str(exc)[:160]})
        return []

    known_anchors = {f"{p.get('filename', '')}#{p.get('chunk_index', 0)}"
                     for p in passages}
    events = [e for e in report.events if not e.anchor or e.anchor in known_anchors]
    dropped = len(report.events) - len(events)
    if dropped:
        # An anchor that is not in the material given is the signature of an
        # invented event. Same posture as citation verification.
        log.warning("timeline.unanchored_dropped", extra={"dropped": dropped})

    # The confirmed structure carries an incident date the documents may not
    # repeat. It is user-confirmed data, so it anchors the whole ordering.
    if case and case.incident_date and not any(e.kind == "incident" for e in events):
        events.append(TimelineEvent(
            date=case.incident_date, kind="incident",
            description=case.summary[:200] or "The incident",
            source="case record", anchor="case record",
        ))
    return events


async def _model_contradictions(
    passages: Sequence[Dict], *, ledger: Optional[TokenLedger] = None,
) -> List[Contradiction]:
    """Conflicts in prose that dates alone cannot show.

    The seam an NLI cross-encoder would replace.
    """
    from app.services import casefile

    rendered = casefile.render_passages(passages, budget=4000)
    if not rendered.strip():
        return []

    prompt = ("Find statements in this case file that cannot both be true.\n\n"
              + prompting.fence(rendered, "CASE_FILE"))
    try:
        report = await llm.generate(
            prompt, TimelineReport, step="timeline.contradictions", tier=FAST,
            system=_CONTRADICTION_SYSTEM, temperature=0.1, ledger=ledger,
        )
    except Exception as exc:
        log.warning("timeline.contradictions_failed", extra={"error": str(exc)[:160]})
        return []

    known = {f"{p.get('filename', '')}#{p.get('chunk_index', 0)}" for p in passages}
    kept: List[Contradiction] = []
    for item in report.contradictions:
        # Both ends must land on passages that actually exist. This is what
        # makes an invented contradiction harmless rather than persuasive.
        if item.anchor_a in known and item.anchor_b in known:
            item.certain = False
            kept.append(item)
    dropped = len(report.contradictions) - len(kept)
    if dropped:
        log.warning("timeline.unanchored_contradictions", extra={"dropped": dropped})
    return kept


# ── entry point ──────────────────────────────────────────────────────────

def _dedupe(items: Sequence[Contradiction]) -> List[Contradiction]:
    seen = set()
    out: List[Contradiction] = []
    for item in items:
        key = tuple(sorted((item.anchor_a, item.anchor_b))) + (item.kind,)
        if key in seen:
            continue
        seen.add(key)
        out.append(item)
    return out


async def build(
    *, debate_id: str, user_id: str, case: Optional[CaseStructure] = None,
    ledger: Optional[TokenLedger] = None, limit: int = 24,
) -> TimelineReport:
    """The timeline and every contradiction in a case file."""
    from app.services import casefile

    passages = await casefile.search(
        debate_id=debate_id, user_id=user_id,
        query="dates, times, sequence of events, statements, recovery, arrest, "
              "complaint, medical examination",
        limit=limit,
    )
    if not passages:
        return TimelineReport(
            note="No documents have been filed in this matter yet. "
                 "Upload the FIR, chargesheet or statements to build a timeline.",
        )

    events = await extract_events(passages, case=case, ledger=ledger)
    contradictions = (find_ordering_conflicts(events)
                      + find_date_conflicts(events)
                      + await _model_contradictions(passages, ledger=ledger))

    # Certain findings first: a lawyer should read the arithmetic before the
    # suggestions.
    ordered = sorted(_dedupe(contradictions), key=lambda c: not c.certain)
    provisional = sum(1 for c in ordered if not c.certain)
    note = ""
    if provisional:
        note = (f"{provisional} of these are provisional — proposed from the "
                f"text and anchored to it, but not derived arithmetically. "
                f"Check them against the documents.")

    log.info("timeline.built",
             extra={"debate_id": debate_id, "events": len(events),
                    "contradictions": len(ordered), "provisional": provisional})
    return TimelineReport(events=sort_events(events),
                          contradictions=ordered, note=note)
