"""Corpus harvesting from the free official publishers.

`pipeline.py` declared six trusted sources and had no way to fetch from any
of them: ingest read a hand-written JSONL file, so the corpus was whatever a
maintainer had typed. This is the other half.

An adapter's only job is to emit records in the shape `build_case_payload` or
`build_statute_payload` already validates, so nothing downstream changes and
a harvested document goes through exactly the same sanitising, provenance
and `verified` checks a hand-written one does.

**On the sources that are not here.** The eCourts judgment search and the
Supreme Court's own judgment search both put a CAPTCHA in front of every
query. That is an access control the publisher chose, and this project does
not work around it. Judgments obtained from those portals by a person, in a
browser, can still be brought in as JSONL through the existing `--source`
path — the corpus does not care how a document arrived, only that its
provenance is recorded and its source is trusted.
"""

from __future__ import annotations

from typing import AsyncIterator, Callable, Dict, List

from app.services.ingest.harvest import indiacode

# name -> (kind, coroutine factory). `kind` selects which ingest function the
# records are fed to, so a new adapter never has to touch the CLI.
ADAPTERS: Dict[str, tuple] = {
    "indiacode": ("statutes", indiacode.harvest),
}


def available() -> List[str]:
    return sorted(ADAPTERS)


def kind_of(name: str) -> str:
    return ADAPTERS[name][0]


async def collect(name: str, targets: List[str]) -> List[dict]:
    """Run an adapter to completion and return its records.

    Materialised rather than streamed: a whole code is a few thousand short
    records, the ingest batches them anyway, and having the count up front is
    what lets the CLI report honestly before it writes anything.
    """
    _kind, factory = ADAPTERS[name]
    return [record async for record in factory(targets)]
