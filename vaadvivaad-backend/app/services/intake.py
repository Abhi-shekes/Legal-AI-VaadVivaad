"""Case intake: turn prose (or a document) into a confirmed case object.

Two textareas of free text used to go straight into the pipeline, and the
`evidence` field the form marked *required* was stored and then never read.
Here both are parsed into a `CaseStructure` that everything downstream reads,
and the structure is returned to the user for correction before anything
expensive runs — which is both cheaper and the natural consent moment.
"""

from __future__ import annotations

import asyncio
from typing import List, Optional, Tuple

from app.core.llm import FAST, TokenLedger, llm
from app.core.logging import get_logger
from app.domain.schemas import (
    CaseStructure,
    EvidenceProfile,
    SectionCandidate,
    SectionCandidates,
    SectionReference,
)
from app.security import prompting
from app.services import concordance

log = get_logger(__name__)

_STRUCTURE_SYSTEM = prompting.system_prompt(
    """You extract a structured case record from a lay description of an
incident in India, for an adversarial legal analysis tool.

Extract only what the text supports. Do not infer facts, do not embellish,
and do not resolve disputes — where the account is one-sided, put the
contested points in `disputed_facts`.

- `summary`: neutral, formal, factual. No legal conclusions.
- `incident_date`: ISO YYYY-MM-DD only if the text gives or clearly implies
  a date. A relative reference ("last Tuesday") with no anchor stays empty.
- `evidence`: every item of proof mentioned, with `in_possession` true only
  when the speaker indicates they actually hold it.
- `user_position`: complainant, accused or neutral, from how they write.

Leave a field empty rather than guessing."""
)

_SECTIONS_SYSTEM = prompting.system_prompt(
    """You identify the provisions of Indian criminal law engaged by a set of
facts.

Return every section the facts plausibly engage, most likely first, with a
confidence. The old behaviour of returning a single section silently dropped
the other offences disclosed by the same facts, so be complete: a night-time
shop break-in with cash taken engages house-breaking AND theft.

Use bare section numbers ('302', '304A'). Set `code` to 'IPC' unless told
otherwise. `rationale` must tie the facts to the elements — one sentence.
Do not include a section the facts cannot support."""
)

_EVIDENCE_SYSTEM = prompting.system_prompt(
    """You list the classes of evidence ordinarily led to prove a given
offence under Indian law, and the categories they fall into. Describe
evidence *types*, never specific invented exhibits."""
)


async def extract_structure(
    description: str,
    evidence_text: str = "",
    *,
    ledger: Optional[TokenLedger] = None,
) -> CaseStructure:
    """Parse the submission into the case object the debate runs on."""
    blocks = ["Extract the case record from this submission.\n",
              prompting.fence(description, "INCIDENT")]
    if evidence_text.strip():
        blocks.append("\nThe person separately listed the evidence they have:\n")
        blocks.append(prompting.fence(evidence_text, "EVIDENCE"))
        blocks.append("\nTreat each item listed there as evidence they possess "
                      "unless they say otherwise.")
    structure = await llm.generate(
        "\n".join(blocks),
        CaseStructure,
        step="intake.structure",
        tier=FAST,
        system=_STRUCTURE_SYSTEM,
        temperature=0.1,
        ledger=ledger,
    )
    log.info("intake.structured",
             extra={"crime_type": structure.crime_type,
                    "evidence_items": len(structure.evidence),
                    "parties": len(structure.parties),
                    "has_date": bool(structure.incident_date)})
    return structure


async def identify_sections(
    case: CaseStructure, *, ledger: Optional[TokenLedger] = None, limit: int = 4
) -> List[SectionCandidate]:
    """Rank the provisions engaged by the facts."""
    code = concordance.applicable_code(case.incident_date)
    prompt = (
        f"Identify the provisions engaged. The governing code for this "
        f"incident date is {code}.\n\n"
        + prompting.fence(case.summary, "FACTS")
    )
    if case.disputed_facts:
        prompt += "\nDisputed: " + "; ".join(case.disputed_facts)

    result = await llm.generate(
        prompt,
        SectionCandidates,
        step="intake.sections",
        tier=FAST,
        system=_SECTIONS_SYSTEM,
        temperature=0.1,
        ledger=ledger,
    )
    ranked = sorted(result.candidates, key=lambda c: c.confidence, reverse=True)[:limit]
    log.info("intake.sections",
             extra={"sections": [c.section for c in ranked], "code": code})
    return ranked


async def evidence_profile(
    section: str, crime_type: str, *, ledger: Optional[TokenLedger] = None
) -> EvidenceProfile:
    """Evidence classes typically led for an offence.

    Cached for a long TTL: this is a pure function of the section and changes
    essentially never, yet it was regenerated on every single debate.
    """
    prompt = (f"Offence: {crime_type or 'unspecified'}. Section: {section}. "
              "List the classes of evidence ordinarily led to prove it.")
    return await llm.generate(
        prompt,
        EvidenceProfile,
        step="intake.evidence_profile",
        tier=FAST,
        system=_EVIDENCE_SYSTEM,
        temperature=0.1,
        ledger=ledger,
        cache_ttl=None,  # set by caller via settings.LLM_CACHE_TTL_SECONDS
    )


_STATUTE_SYSTEM = prompting.system_prompt(
    """You state the elements of an offence under Indian criminal law for use
by counsel.

Be precise and conservative. Give the elements that must be proved, the
mental element, the standard of proof, the punishment range, and the
recognised general or special exceptions. If you are not confident of the
exact statutory wording, describe the element in substance rather than
inventing a quotation. Never cite a case."""
)


async def derive_statute(
    section: str, code: str = "IPC", *, ledger: Optional[TokenLedger] = None
) -> SectionReference:
    """Fallback statute reference when the curated corpus has no entry.

    This is model output, and it is treated accordingly: it is cached (keyed
    deterministically by section) but it is **never written to the retrieval
    corpus**, and the UI labels the section panel as unverified when it came
    from here. That distinction — cache versus corpus — is the line the old
    code crossed when it persisted generated statute text into Qdrant for
    future users to retrieve as fact.
    """
    from app.core.config import settings

    reference = await llm.generate(
        f"State the elements of {code} section {section}.",
        SectionReference,
        step="intake.statute_fallback",
        tier=FAST,
        system=_STATUTE_SYSTEM,
        temperature=0.0,
        ledger=ledger,
        cache_ttl=settings.LLM_CACHE_TTL_SECONDS,
    )
    # The model does not reliably echo these back; set them from what we asked.
    return reference.model_copy(update={"section": section, "code": code})


async def prepare(
    description: str,
    evidence_text: str = "",
    *,
    ledger: Optional[TokenLedger] = None,
) -> Tuple[CaseStructure, List[SectionCandidate]]:
    """Structure the case, then identify sections. Sequential by necessity —
    section identification needs the cleaned facts."""
    case = await extract_structure(description, evidence_text, ledger=ledger)
    sections = await identify_sections(case, ledger=ledger)
    return case, sections
