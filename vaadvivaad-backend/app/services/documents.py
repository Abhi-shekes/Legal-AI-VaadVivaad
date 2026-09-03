"""Document intake (Feature 04).

Two textareas is a poor on-ramp for people who are holding an FIR, a
chargesheet, a legal notice or a bail order. This parses those into the same
`CaseStructure` the typed path produces, so everything downstream is unchanged
and the extracted structure is shown back for correction before any debate
runs.

Gemini reads PDFs and images natively, so no separate OCR dependency is
needed for the common case. Scanned documents where that struggles are the
place for Docling or Unstructured; the seam is `extract_from_bytes`.
"""

from __future__ import annotations

from typing import Optional, Tuple

from google.genai import types

from app.core.errors import ValidationFailed
from app.core.llm import FAST, TokenLedger, llm
from app.core.logging import get_logger
from app.domain.schemas import CaseStructure
from app.security import prompting

log = get_logger(__name__)

# Kept deliberately tight. A criminal case file is a handful of pages; a
# 40 MB upload is either a mistake or an attempt to exhaust the worker.
MAX_BYTES = 12 * 1024 * 1024

SUPPORTED = {
    "application/pdf": "pdf",
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image",
    "text/plain": "text",
}

DOCUMENT_KINDS = (
    "First Information Report (FIR)",
    "chargesheet / final report",
    "legal notice",
    "bail order or application",
    "complaint",
    "witness statement",
    "medical or post-mortem report",
    "seizure memo / panchnama",
)

_SYSTEM = prompting.system_prompt(
    f"""You extract a structured case record from an Indian legal document.

The document will be one of: {', '.join(DOCUMENT_KINDS)}, or something similar.

Extract only what the document states. This is the critical rule: a document
of this kind records allegations, not findings. Do not convert an allegation
into a fact, do not resolve a contradiction, and do not supply a detail the
document omits.

- `summary`: neutral recital of what the document records.
- `incident_date`: ISO YYYY-MM-DD, from the document. Distinguish the date of
  the incident from the date the document was drawn up; you want the incident.
- `parties`: complainant, accused, witnesses, investigating officer, with the
  designations the document uses.
- `evidence`: every item of property, exhibit, seizure or record referred to.
  Set `in_possession` true only where the document says it has been seized or
  produced.
- `disputed_facts`: anything the document itself flags as contested, denied,
  or stated only on information and belief.

Redact nothing; leave a field empty rather than guessing at it."""
)


def validate(filename: str, content_type: str, size: int) -> str:
    if size > MAX_BYTES:
        raise ValidationFailed(
            f"file is {size // (1024 * 1024)} MB",
            user_message=f"That file is too large. The limit is {MAX_BYTES // (1024 * 1024)} MB.",
        )
    if size == 0:
        raise ValidationFailed("empty file", user_message="That file is empty.")
    kind = SUPPORTED.get((content_type or "").split(";")[0].strip().lower())
    if kind is None:
        raise ValidationFailed(
            f"unsupported type {content_type}",
            user_message="Upload a PDF, a photograph of the document, or a text file.",
        )
    return kind


async def extract_from_bytes(
    data: bytes,
    content_type: str,
    filename: str = "",
    *,
    extra_note: str = "",
    ledger: Optional[TokenLedger] = None,
) -> Tuple[CaseStructure, str]:
    """Parse a document into a case structure. Returns (structure, kind)."""
    kind = validate(filename, content_type, len(data))

    instruction = (
        "Extract the case record from the attached document. If the document "
        "is not an Indian legal document at all, return an empty summary "
        "rather than inventing content."
    )
    if extra_note.strip():
        instruction += ("\n\nThe person who uploaded it added this note:\n"
                        + prompting.fence(extra_note, "UPLOADER_NOTE"))

    if kind == "text":
        # Plain text is not a document the model needs to *read*; it is the
        # same job as the typed path, just longer.
        text = data.decode("utf-8", errors="replace")[:120_000]
        contents = instruction + "\n\n" + prompting.fence(text, "DOCUMENT")
    else:
        contents = [
            types.Part.from_bytes(data=data, mime_type=content_type.split(";")[0].strip()),
            instruction,
        ]

    structure = await llm.generate(
        contents,
        CaseStructure,
        step="documents.extract",
        tier=FAST,
        system=_SYSTEM,
        temperature=0.1,
        ledger=ledger,
    )
    log.info("documents.extracted",
             extra={"kind": kind, "bytes": len(data),
                    "parties": len(structure.parties),
                    "evidence": len(structure.evidence),
                    "has_summary": bool(structure.summary.strip())})

    if not structure.summary.strip():
        raise ValidationFailed(
            "no case content found",
            user_message="We could not read a case out of that document. "
                         "Try a clearer scan, or describe the incident in your own words.",
        )
    return structure, kind


def to_submission(structure: CaseStructure) -> Tuple[str, str]:
    """Flatten a parsed structure back into the (description, evidence) pair
    the debate pipeline takes, so both intake paths converge."""
    lines = [structure.summary]
    if structure.incident_date:
        lines.append(f"Date of incident: {structure.incident_date}")
    if structure.location:
        lines.append(f"Location: {structure.location}")
    if structure.parties:
        lines.append("Parties: " + "; ".join(
            f"{p.role}{' — ' + p.name if p.name else ''}" for p in structure.parties))
    if structure.disputed_facts:
        lines.append("Disputed: " + "; ".join(structure.disputed_facts))
    evidence = "; ".join(
        f"{item.description}{' (seized/produced)' if item.in_possession else ''}"
        for item in structure.evidence
    )
    return "\n".join(lines), evidence
