"""CI guard on the IPC/BNS concordance.

A wrong section number is worse than no section number, so this fails the
build if the table drifts into claiming an authority it does not have:

  * an entry marked `verified` while nobody has signed the table off;
  * a malformed section reference on either side of a mapping;
  * duplicate IPC keys, where the later silently wins.

Run:  python -m app.services.checks.concordance_check
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parents[2] / "data" / "ipc_bns_concordance.json"
SECTION = re.compile(r"^\d+[A-Z]?(\(\d+\))?$")


def main() -> int:
    payload = json.loads(DATA.read_text(encoding="utf-8"))
    meta = payload.get("_meta", {})
    signed_off = bool(meta.get("sign_off", {}).get("reviewed_by"))
    problems: list[str] = []
    seen: set[str] = set()

    for row in payload.get("mappings", []):
        ipc, bns = str(row.get("ipc", "")), str(row.get("bns", ""))
        if not SECTION.match(ipc):
            problems.append(f"malformed IPC section: {ipc!r}")
        if not SECTION.match(bns):
            problems.append(f"malformed BNS section: {bns!r}")
        if ipc in seen:
            problems.append(f"duplicate IPC key: {ipc}")
        seen.add(ipc)
        if row.get("verified") and not signed_off:
            problems.append(
                f"{ipc} is marked verified but _meta.sign_off.reviewed_by is empty"
            )

    total = len(payload.get("mappings", []))
    verified = sum(1 for r in payload.get("mappings", []) if r.get("verified"))
    print(f"concordance: {total} mappings, {verified} verified, "
          f"signed_off={signed_off}")
    if problems:
        print("\nFAILED:")
        for problem in problems:
            print(f"  - {problem}")
        return 1
    if not signed_off:
        print("note: table is unsigned, so every mapping is surfaced to users "
              "as provisional. That is expected until a reviewer signs it off.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
