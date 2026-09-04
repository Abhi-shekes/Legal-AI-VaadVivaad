"""The citation graph: is this authority still good law?

`citations.verify_turn()` proves an authority was *retrieved*. Nothing proved
it was still *good law* — counsel could cite a judgment overruled in 2018 and
the verifier would pass it clean, because it exists in the corpus and the
corpus has no idea what happened to it afterwards.

This adds the missing edge: which judgment cites which, and how it treated
it. A precedent then carries its own warning.

**Where the edges come from, and where they do not.**

They come from two places, both of them *extraction*, never generation:

  * an explicit `cites` list on an ingested record, which is hand-checked
    data from a curated source — the same posture `concordance.py` takes,
    and for the same reason: a wrong statement about whether a case is good
    law is worse than no statement;
  * cue phrases found in the judgment's own text ("overruled in", "we
    respectfully distinguish"), matched lexically against a fixed vocabulary.

They do **not** come from asking a model what treated what. This codebase
already learned once what happens when generated content enters the corpus
and is retrieved as ground truth by the next user.

**Honest limitation.** The graph is only as good as its inputs, and the free
sources that survive `harvest/` do not publish full judgment text — the
portals that do are CAPTCHA-gated. So on a corpus built from summaries the
graph is thin, and thin means silent: no edge is reported as no treatment,
never as "good law". `has_data()` says which it is.
"""

from __future__ import annotations

import re
from typing import Dict, Iterable, List, Optional, Sequence

from app.core.logging import get_logger

log = get_logger(__name__)

# Ordered most-severe first: a sentence saying a case was "overruled and
# distinguished" is reporting an overruling.
# Inflections are optional throughout: a judgment says "we distinguish" and
# "we follow" as readily as "distinguished" and "followed", and requiring the
# suffix silently classified both as a bare citation.
#
# The looseness is deliberately asymmetric. `overruled` stays tight -- a false
# positive there tells counsel to abandon good authority, which is the most
# damaging mistake this file can make. `followed` is permissive, because its
# false positive ("the following facts") costs nothing worse than a neutral
# label on a case that was cited anyway.
TREATMENT_CUES = [
    ("overruled", (r"\boverrul(?:e|ed|es|ing)\b", r"\bno longer good law\b",
                   r"\bper incuriam\b", r"\bset aside the ratio\b")),
    ("doubted", (r"\bdoubt(?:ed|s)?\b", r"\bwe are unable to agree\b",
                 r"\bwith respect,? we differ\b", r"\bcalls? for reconsideration\b")),
    ("distinguished", (r"\bdistinguish(?:ed|es|ing)?\b",
                       r"\bturned on its own facts\b",
                       r"\bhas no application\b",
                       r"\bis inapplicable\b")),
    ("explained", (r"\bexplain(?:ed|s)?\b", r"\bclarif(?:y|ied|ies)\b")),
    ("followed", (r"\bfollow(?:ed|s|ing)?\b", r"\brel(?:y|ied|ies) (?:up)?on\b",
                  r"\bappl(?:y|ied|ies)\b", r"\baffirm(?:ed|s)?\b",
                  r"\bapprov(?:e|ed|es)\b", r"\breiterat(?:e|ed|es)\b")),
]

_COMPILED = [(name, [re.compile(p, re.I) for p in patterns])
             for name, patterns in TREATMENT_CUES]

# Treatments that should stop counsel from leaning on an authority.
NEGATIVE = {"overruled", "doubted"}
CAUTION = {"distinguished"}

VALID_TREATMENTS = {name for name, _ in TREATMENT_CUES} | {"cited"}


def classify_treatment(text: str) -> str:
    """Which treatment a sentence describes. 'cited' when no cue fires.

    Deliberately lexical and inspectable. A cross-encoder would be more
    accurate and far less explainable, and "why does it say this case was
    overruled" has to have an answer a lawyer can check.
    """
    for name, patterns in _COMPILED:
        if any(pattern.search(text or "") for pattern in patterns):
            return name
    return "cited"


def normalise_treatment(value: str) -> str:
    lowered = (value or "").strip().lower()
    return lowered if lowered in VALID_TREATMENTS else "cited"


# ── extraction ───────────────────────────────────────────────────────────

def edges_from_record(payload: Dict) -> List[Dict]:
    """Citation edges declared by, or findable in, one corpus record.

    `cites` accepts either a bare citation_id or an object carrying the
    treatment and the passage it was read from, so a curated source can be
    precise and a lazy one can still contribute a plain reference.
    """
    source = (payload.get("citation_id") or "").strip()
    if not source:
        return []

    edges: List[Dict] = []
    seen = set()

    for entry in payload.get("cites") or []:
        if isinstance(entry, str):
            target, treatment, passage = entry.strip(), "cited", ""
        elif isinstance(entry, dict):
            target = (entry.get("citation_id") or "").strip()
            treatment = normalise_treatment(entry.get("treatment", ""))
            passage = (entry.get("passage") or "")[:500]
            # A declared passage that contradicts a declared treatment is a
            # data error worth surfacing, not silently preferring one.
            if passage and treatment == "cited":
                treatment = classify_treatment(passage)
        else:
            continue

        if not target or target == source or target in seen:
            continue
        seen.add(target)
        edges.append({
            "source": source,
            "target": target,
            "treatment": treatment,
            "passage": passage,
            "origin": "declared",
        })

    return edges


def edges_from_text(payload: Dict, known: Dict[str, str]) -> List[Dict]:
    """Mine edges from the judgment's own prose.

    `known` maps a lowercased case name to its citation_id — resolution is
    against the corpus, so a reference to a judgment we do not hold produces
    no edge rather than a dangling one.
    """
    source = (payload.get("citation_id") or "").strip()
    text = " ".join(filter(None, (payload.get("summary"), payload.get("holding"),
                                  payload.get("full_text"))))
    if not source or not text:
        return []

    edges: List[Dict] = []
    seen = set()
    for sentence in re.split(r"(?<=[.;])\s+", text):
        for name, target in known.items():
            if target == source or target in seen:
                continue
            if name and name in sentence.lower():
                seen.add(target)
                edges.append({
                    "source": source,
                    "target": target,
                    "treatment": classify_treatment(sentence),
                    "passage": sentence.strip()[:500],
                    "origin": "mined",
                })
    return edges


# ── storage ──────────────────────────────────────────────────────────────

async def ensure_indexes() -> None:
    from pymongo import ASCENDING

    from app.db.mongodb import db

    try:
        await db.citations.create_index(
            [("source", ASCENDING), ("target", ASCENDING)],
            unique=True, name="uniq_edge",
        )
        await db.citations.create_index([("target", ASCENDING)], name="by_target")
    except Exception as exc:
        log.warning("authority.index_failed", extra={"error": str(exc)[:160]})


async def save_edges(edges: Sequence[Dict]) -> int:
    """Upsert edges. Re-running an ingest updates rather than duplicating."""
    if not edges:
        return 0
    from pymongo import UpdateOne

    from app.db.mongodb import db

    operations = [
        UpdateOne({"source": e["source"], "target": e["target"]},
                  {"$set": e}, upsert=True)
        for e in edges
    ]
    try:
        result = await db.citations.bulk_write(operations, ordered=False)
        return (result.upserted_count or 0) + (result.modified_count or 0)
    except Exception as exc:
        log.warning("authority.save_failed", extra={"error": str(exc)[:160]})
        return 0


async def has_data() -> bool:
    """Whether the graph holds anything at all.

    Callers use this to tell "no negative treatment recorded" apart from
    "nothing is recorded", which are very different things to show a lawyer.
    """
    from app.db.mongodb import db

    try:
        return await db.citations.estimated_document_count() > 0
    except Exception:
        return False


async def treatments_for(citation_ids: Iterable[str]) -> Dict[str, List[Dict]]:
    """How later judgments have treated each of these authorities."""
    ids = [c for c in citation_ids if c]
    if not ids:
        return {}
    from app.db.mongodb import db

    out: Dict[str, List[Dict]] = {c: [] for c in ids}
    try:
        async for edge in db.citations.find({"target": {"$in": ids}}):
            out.setdefault(edge["target"], []).append({
                "by": edge.get("source", ""),
                "treatment": edge.get("treatment", "cited"),
                "passage": edge.get("passage", ""),
                "origin": edge.get("origin", ""),
            })
    except Exception as exc:
        log.warning("authority.lookup_failed", extra={"error": str(exc)[:160]})
    return out


async def cited_by_counts(citation_ids: Iterable[str]) -> Dict[str, int]:
    """In-degree: how often each authority is cited by others in the corpus."""
    ids = [c for c in citation_ids if c]
    if not ids:
        return {}
    from app.db.mongodb import db

    counts = {c: 0 for c in ids}
    try:
        cursor = db.citations.aggregate([
            {"$match": {"target": {"$in": ids}}},
            {"$group": {"_id": "$target", "n": {"$sum": 1}}},
        ])
        async for row in cursor:
            counts[row["_id"]] = row["n"]
    except Exception as exc:
        log.warning("authority.count_failed", extra={"error": str(exc)[:160]})
    return counts


# ── presentation ─────────────────────────────────────────────────────────

def worst_treatment(treatments: Sequence[Dict]) -> str:
    """The most severe treatment recorded, or '' when nothing is."""
    order = [name for name, _ in TREATMENT_CUES]
    found = [t.get("treatment", "") for t in treatments]
    for name in order:
        if name in found:
            return name
    return "cited" if found else ""


async def annotate(precedents: Sequence) -> Sequence:
    """Attach treatment and in-degree to retrieved precedents, in place.

    Never raises and never removes a precedent: an authority that was
    distinguished is still worth putting in front of counsel, with the
    warning attached. Suppressing it would hide the disagreement, which is
    usually the most interesting thing about the case.
    """
    ids = [p.citation_id for p in precedents if getattr(p, "citation_id", "")]
    if not ids:
        return precedents
    treatments = await treatments_for(ids)
    counts = await cited_by_counts(ids)
    for precedent in precedents:
        recorded = treatments.get(precedent.citation_id, [])
        precedent.treatment = worst_treatment(recorded)
        precedent.treated_by = [t["by"] for t in recorded
                                if t.get("treatment") in NEGATIVE | CAUTION]
        precedent.cited_by = counts.get(precedent.citation_id, 0)
    return precedents
