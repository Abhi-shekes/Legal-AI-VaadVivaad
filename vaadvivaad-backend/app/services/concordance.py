"""IPC ↔ BNS statute routing.

The whole system was written against the Indian Penal Code. The Bharatiya
Nyaya Sanhita replaced it for offences committed on or after 1 July 2024
(with the BNSS and BSA replacing the CrPC and the Evidence Act), so for a
recent incident the product was returning a section number that no longer
exists — a correctness defect in the core domain.

Both codes stay live in the courts for years, so the rule is: route by
incident date, and always show the counterpart.

The mapping is **data, never model output**. Asking an LLM to produce a
concordance is precisely the failure this codebase already had once, and a
wrong section number is worse than no section number. Unverified entries are
labelled as provisional all the way through to the UI.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional

from app.core.logging import get_logger

log = get_logger(__name__)

IPC = "IPC"
BNS = "BNS"

# BNS applies to offences committed on or after this date.
BNS_EFFECTIVE = date(2024, 7, 1)

_DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "ipc_bns_concordance.json"


@dataclass(frozen=True)
class Mapping:
    ipc: str
    bns: str
    subject: str
    verified: bool

    @property
    def provisional(self) -> bool:
        return not self.verified


@dataclass(frozen=True)
class Repealed:
    ipc: str
    note: str
    verified: bool


class Concordance:
    def __init__(self, payload: Dict) -> None:
        self._by_ipc: Dict[str, Mapping] = {}
        self._by_bns: Dict[str, Mapping] = {}
        for row in payload.get("mappings", []):
            mapping = Mapping(
                ipc=_norm(row["ipc"]), bns=row["bns"],
                subject=row.get("subject", ""), verified=bool(row.get("verified")),
            )
            self._by_ipc[mapping.ipc] = mapping
            self._by_bns.setdefault(_norm(mapping.bns), mapping)
        self._repealed: Dict[str, Repealed] = {
            _norm(row["ipc"]): Repealed(_norm(row["ipc"]), row.get("note", ""),
                                        bool(row.get("verified")))
            for row in payload.get("repealed_without_counterpart", [])
        }
        self.meta = payload.get("_meta", {})
        self.companion_codes = payload.get("companion_codes", {})

    # ── Lookup ───────────────────────────────────────────────────────────

    def to_bns(self, ipc_section: str) -> Optional[Mapping]:
        return self._by_ipc.get(_norm(ipc_section))

    def to_ipc(self, bns_section: str) -> Optional[Mapping]:
        return self._by_bns.get(_norm(bns_section))

    def repealed(self, ipc_section: str) -> Optional[Repealed]:
        return self._repealed.get(_norm(ipc_section))

    @property
    def signed_off(self) -> bool:
        """True once a human has checked the table against the official text."""
        return bool(self.meta.get("sign_off", {}).get("reviewed_by"))

    def coverage(self) -> Dict[str, int]:
        return {
            "mappings": len(self._by_ipc),
            "verified": sum(1 for m in self._by_ipc.values() if m.verified),
            "repealed": len(self._repealed),
        }


def _norm(section: str) -> str:
    """'Section 302 - Murder' -> '302'; '103(1)' keeps its sub-clause."""
    text = (section or "").strip()
    text = re.sub(r"^(section|sec\.?|s\.)\s*", "", text, flags=re.I)
    match = re.match(r"(\d+\s*[A-Za-z]?(?:\(\d+\))?)", text)
    return match.group(1).replace(" ", "").upper() if match else text.upper()


@lru_cache(maxsize=1)
def get_concordance() -> Concordance:
    try:
        with _DATA_PATH.open(encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, ValueError) as exc:
        log.error("concordance.load_failed", extra={"error": str(exc)[:200]})
        payload = {"mappings": [], "repealed_without_counterpart": []}
    concordance = Concordance(payload)
    if not concordance.signed_off:
        log.warning(
            "concordance.unverified",
            extra={"detail": "IPC/BNS table has not been signed off against the "
                             "official concordance; mappings are shown as provisional",
                   **concordance.coverage()},
        )
    return concordance


# ── Routing ──────────────────────────────────────────────────────────────

def parse_incident_date(value: str) -> Optional[date]:
    """Accept YYYY-MM-DD, YYYY-MM or YYYY. Returns None when unusable."""
    text = (value or "").strip()
    for pattern, builder in (
        (r"^(\d{4})-(\d{2})-(\d{2})$", lambda m: date(int(m[1]), int(m[2]), int(m[3]))),
        (r"^(\d{4})-(\d{2})$", lambda m: date(int(m[1]), int(m[2]), 1)),
        (r"^(\d{4})$", lambda m: date(int(m[1]), 1, 1)),
    ):
        match = re.match(pattern, text)
        if match:
            try:
                return builder(match)
            except ValueError:
                return None
    return None


def applicable_code(incident_date: str) -> str:
    """Which code governs an offence committed on this date.

    An unknown date falls back to the IPC: most matters reaching this product
    predate the changeover, and the counterpart is shown regardless, so the
    user sees both either way.
    """
    parsed = parse_incident_date(incident_date)
    if parsed is None:
        return IPC
    return BNS if parsed >= BNS_EFFECTIVE else IPC


@dataclass
class SectionView:
    """A section presented in both codes, with provenance about the mapping."""

    primary_code: str
    primary_section: str
    counterpart_code: str = ""
    counterpart_section: str = ""
    subject: str = ""
    provisional: bool = True
    note: str = ""

    def label(self) -> str:
        base = f"{self.primary_code} {self.primary_section}"
        if self.counterpart_section:
            base += f" (≈ {self.counterpart_code} {self.counterpart_section})"
        return base

    def to_payload(self) -> Dict:
        return {
            "primary_code": self.primary_code,
            "primary_section": self.primary_section,
            "counterpart_code": self.counterpart_code,
            "counterpart_section": self.counterpart_section,
            "subject": self.subject,
            "provisional": self.provisional,
            "note": self.note,
            "label": self.label(),
        }


def resolve(section: str, *, code: str = IPC, incident_date: str = "") -> SectionView:
    """Present a section under the code that governs, with its counterpart."""
    concordance = get_concordance()
    governing = applicable_code(incident_date)
    normalised = _norm(section)

    if code.upper() == IPC:
        repealed = concordance.repealed(normalised)
        if repealed:
            return SectionView(
                primary_code=IPC, primary_section=normalised,
                subject="", provisional=not repealed.verified, note=repealed.note,
            )
        mapping = concordance.to_bns(normalised)
        if mapping is None:
            return SectionView(
                primary_code=IPC, primary_section=normalised, provisional=True,
                note="No BNS counterpart is recorded for this section in the "
                     "local concordance; confirm against the official table.",
            )
        if governing == BNS:
            return SectionView(
                primary_code=BNS, primary_section=mapping.bns,
                counterpart_code=IPC, counterpart_section=mapping.ipc,
                subject=mapping.subject, provisional=mapping.provisional,
                note=_provisional_note(mapping.provisional),
            )
        return SectionView(
            primary_code=IPC, primary_section=mapping.ipc,
            counterpart_code=BNS, counterpart_section=mapping.bns,
            subject=mapping.subject, provisional=mapping.provisional,
            note=_provisional_note(mapping.provisional),
        )

    mapping = concordance.to_ipc(normalised)
    if mapping is None:
        return SectionView(primary_code=BNS, primary_section=normalised, provisional=True)
    return SectionView(
        primary_code=BNS, primary_section=mapping.bns,
        counterpart_code=IPC, counterpart_section=mapping.ipc,
        subject=mapping.subject, provisional=mapping.provisional,
        note=_provisional_note(mapping.provisional),
    )


def _provisional_note(provisional: bool) -> str:
    if not provisional:
        return ""
    return ("This IPC/BNS correspondence is provisional and has not been "
            "verified against the official concordance.")


def statute_note(incident_date: str) -> str:
    """One line for the UI explaining which code is being applied and why."""
    parsed = parse_incident_date(incident_date)
    if parsed is None:
        return ("No incident date was given, so sections are shown under the IPC "
                "with their BNS counterparts. Offences on or after 1 July 2024 "
                "are charged under the BNS.")
    if parsed >= BNS_EFFECTIVE:
        return (f"The incident is dated {parsed.isoformat()}, on or after "
                "1 July 2024, so the Bharatiya Nyaya Sanhita applies.")
    return (f"The incident is dated {parsed.isoformat()}, before 1 July 2024, "
            "so the Indian Penal Code applies.")
