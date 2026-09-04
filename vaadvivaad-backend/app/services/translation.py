"""Indian-language intake and output (Feature 10).

A person describing a police matter will not do it in a second language. The
pipeline reasons and retrieves in English against an English corpus, then
renders the transcript back in the language the case was filed in.

Section numbers, case citations and terms of art stay in their canonical
English form on purpose: "IPC 302" and "Sharad Birdhichand Sarda" are
identifiers, and translating them makes them unusable in a court.
"""

from __future__ import annotations

import re
from typing import Dict, Optional

from app.core.llm import FAST, TokenLedger, llm
from app.core.logging import get_logger
from app.domain.schemas import Translation
from app.security import prompting

log = get_logger(__name__)

# Script ranges are a cheap, reliable first pass — far more dependable than
# asking a model "what language is this" for a one-line input.
SUPPORTED: Dict[str, Dict[str, str]] = {
    "en": {"name": "English", "script": ""},
    "hi": {"name": "Hindi", "script": r"ऀ-ॿ"},
    "mr": {"name": "Marathi", "script": r"ऀ-ॿ"},
    "bn": {"name": "Bengali", "script": r"ঀ-৿"},
    "ta": {"name": "Tamil", "script": r"஀-௿"},
    "te": {"name": "Telugu", "script": r"ఀ-౿"},
    "gu": {"name": "Gujarati", "script": r"઀-૿"},
    "kn": {"name": "Kannada", "script": r"ಀ-೿"},
    "ml": {"name": "Malayalam", "script": r"ഀ-ൿ"},
    "pa": {"name": "Punjabi", "script": r"਀-੿"},
    "or": {"name": "Odia", "script": r"଀-୿"},
    "ur": {"name": "Urdu", "script": r"؀-ۿ"},
}

_SCRIPT_TO_LANG = [
    (re.compile(f"[{meta['script']}]"), code)
    for code, meta in SUPPORTED.items() if meta["script"]
]

# Devanagari is shared by Hindi and Marathi, so script alone cannot separate
# them; the model settles it only when we already know it is Devanagari.
_AMBIGUOUS = {"hi", "mr"}


def detect_script(text: str) -> Optional[str]:
    """Language code from the script used, or None for Latin/unknown."""
    counts = {code: len(pattern.findall(text or "")) for pattern, code in _SCRIPT_TO_LANG}
    best = max(counts, key=counts.get) if counts else None
    if not best or counts[best] < 3:
        return None
    return best


def language_name(code: str) -> str:
    return SUPPORTED.get(code, {}).get("name", code)


def _system(target: str) -> str:
    return prompting.system_prompt(
        f"""You translate legal text into {language_name(target)} for an Indian
criminal-law tool.

Preserve exactly, in their English form, and do not transliterate:
- statute references (IPC 302, BNS 103, section numbers, Article numbers)
- case names and citations (Sharad Birdhichand Sarda v. State of Maharashtra)
- court names, and the terms mens rea, prima facie, res judicata

Translate the surrounding argument into natural, formal {language_name(target)}
as a lawyer would write it. Do not summarise, expand, soften or comment. Return
only the translation."""
    )


async def to_english(
    text: str, source: str, *, ledger: Optional[TokenLedger] = None
) -> str:
    """Bring a submission into English so retrieval works against the corpus."""
    if source == "en" or not text.strip():
        return text
    result = await llm.generate(
        "Translate this into English, preserving every statute reference and "
        "case name verbatim:\n\n" + prompting.fence(text, "SOURCE"),
        Translation,
        step="translate.in",
        tier=FAST,
        system=prompting.system_prompt(
            "You translate an Indian legal submission into English. Preserve "
            "statute references, case names and terms of art exactly. Do not "
            "add or remove any fact."
        ),
        temperature=0.1,
        ledger=ledger,
    )
    return result.text


async def from_english(
    text: str, target: str, *, ledger: Optional[TokenLedger] = None
) -> str:
    """Render generated output back into the filing language."""
    if target == "en" or not text.strip():
        return text
    if target not in SUPPORTED:
        log.warning("translation.unsupported", extra={"target": target})
        return text
    result = await llm.generate(
        prompting.fence(text, "TEXT"),
        Translation,
        step="translate.out",
        tier=FAST,
        system=_system(target),
        temperature=0.2,
        ledger=ledger,
    )
    return result.text


async def resolve_language(text: str, *, ledger: Optional[TokenLedger] = None) -> str:
    """Best-effort language of a submission.

    Script detection first because it is free and certain; the model is asked
    only to disambiguate languages that share a script.
    """
    detected = detect_script(text)
    if detected is None:
        return "en"
    if detected not in _AMBIGUOUS:
        return detected
    try:
        answer = await llm.generate(
            "Which language is this written in? Reply with exactly one of: "
            "hi, mr.\n\n" + prompting.fence(text[:600], "SAMPLE"),
            Translation,
            step="translate.detect",
            tier=FAST,
            system=prompting.system_prompt(
                "You identify the language of a Devanagari text. Reply with "
                "only the two-letter code."
            ),
            temperature=0.0,
            ledger=ledger,
        )
        code = answer.text.strip().lower()[:2]
        return code if code in _AMBIGUOUS else detected
    except Exception:
        return detected
