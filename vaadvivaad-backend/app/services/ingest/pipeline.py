"""Corpus ingest — the only thing permitted to write to Qdrant.

This is the other half of the F-01/F-02 fix. Removing the write calls from
the request path is necessary but not sufficient: something still has to put
*real* judgments in, or retrieval returns nothing forever and the product has
no grounding.

Rules this pipeline enforces:

  * every document carries provenance — where it came from, when it was
    fetched, and under what identifier;
  * `verified` is set only for documents from a declared, curated source, and
    retrieval refuses to cite anything else;
  * instruction-shaped text is stripped before indexing, because a corpus is
    a persistent injection vector if it is not (the previous design let model
    output become retrievable, which is exactly that attack, self-inflicted);
  * ingest is idempotent — re-running it updates rather than duplicating.

Run it with:  python -m app.services.ingest.pipeline --source fixtures.jsonl
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from qdrant_client.http import models as qm

from app.core.llm import llm
from app.core.logging import configure, get_logger
from app.core.qdrant_client import CASE_LAWS, STATUTES, ensure_collection, get_client
from app.security import prompting
from app.services.retrieval import court_rank, normalise_section

log = get_logger(__name__)

# Sources whose documents may be marked `verified`. Anything else is indexed
# as unverified and will never be offered to counsel as citable authority.
TRUSTED_SOURCES = {"indiankanoon", "sci-archive", "ecourts", "gazette", "curated"}

_MAX_CHARS = 4000


@dataclass
class IngestStats:
    read: int = 0
    written: int = 0
    skipped: int = 0
    reasons: Dict[str, int] = field(default_factory=dict)

    def skip(self, reason: str) -> None:
        self.skipped += 1
        self.reasons[reason] = self.reasons.get(reason, 0) + 1

    def as_dict(self) -> Dict[str, Any]:
        return {"read": self.read, "written": self.written,
                "skipped": self.skipped, "reasons": self.reasons}


def stable_point_id(citation_id: str) -> str:
    """Deterministic uuid so re-ingesting updates in place."""
    digest = hashlib.sha256(citation_id.encode("utf-8")).hexdigest()
    return f"{digest[:8]}-{digest[8:12]}-{digest[12:16]}-{digest[16:20]}-{digest[20:32]}"


def sanitise(text: str) -> str:
    """Strip anything that reads as an instruction to a model.

    A judgment does not contain "ignore previous instructions"; if a document
    does, it was not written by a court.
    """
    cleaned = (text or "").strip()
    for _, pattern in prompting._INJECTION_PATTERNS:  # noqa: SLF001 - same package
        cleaned = pattern.sub("[removed]", cleaned)
    cleaned = re.sub(r"<<<(?:END_)?[A-Z_]+:[0-9a-f]+>>>", "[removed]", cleaned)
    return re.sub(r"\s+", " ", cleaned).strip()


def _year(date_str: str) -> int:
    match = re.match(r"(\d{4})", date_str or "")
    return int(match.group(1)) if match else 0


def build_case_payload(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Normalise one source record into the corpus schema."""
    citation_id = (raw.get("citation_id") or "").strip()
    case_name = sanitise(raw.get("case_name", ""))
    if not citation_id or not case_name:
        return None

    source = (raw.get("source") or "").strip().lower()
    sections = [normalise_section(s) for s in raw.get("sections", []) if s]
    summary = sanitise(raw.get("summary", ""))[:_MAX_CHARS]
    holding = sanitise(raw.get("holding", ""))[:_MAX_CHARS]

    return {
        "citation_id": citation_id,
        "case_name": case_name,
        "court": sanitise(raw.get("court", "")),
        "court_rank": court_rank(raw.get("court", "")),
        "date": (raw.get("date") or "")[:10],
        "year": _year(raw.get("date", "")),
        "sections": sections,
        "codes": sorted({(c or "IPC").upper() for c in raw.get("codes", ["IPC"])}),
        "holding": holding,
        "summary": summary,
        "source_url": (raw.get("source_url") or "")[:500],
        # The single most important field in the corpus.
        "verified": source in TRUSTED_SOURCES,
        "provenance": {
            "source": source or "unknown",
            "retrieved_at": raw.get("retrieved_at", ""),
            "ingested_by": "app.services.ingest.pipeline",
        },
    }


def embedding_text(payload: Dict[str, Any]) -> str:
    """What actually gets embedded.

    Facts and holding, not the case name: retrieval has to discriminate
    between two judgments under the same section on their facts.
    """
    parts = [
        payload["case_name"],
        f"Court: {payload['court']}" if payload["court"] else "",
        f"Sections: {', '.join(payload['sections'])}" if payload["sections"] else "",
        payload["summary"],
        f"Holding: {payload['holding']}" if payload["holding"] else "",
    ]
    return "\n".join(p for p in parts if p)[:_MAX_CHARS]


def build_statute_payload(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    section = normalise_section(raw.get("section", ""))
    if not section:
        return None
    reference = raw.get("reference") or {}
    return {
        "section": section,
        "code": (raw.get("code") or "IPC").upper(),
        "reference": reference,
        "verified": (raw.get("source") or "").lower() in TRUSTED_SOURCES,
        "provenance": {"source": raw.get("source", "unknown"),
                       "retrieved_at": raw.get("retrieved_at", "")},
    }


def read_records(path: Path) -> Iterable[Dict[str, Any]]:
    """JSONL, one record per line. Bad lines are reported, not fatal."""
    with path.open(encoding="utf-8") as handle:
        for number, line in enumerate(handle, 1):
            line = line.strip()
            if not line or line.startswith("//"):
                continue
            try:
                yield json.loads(line)
            except ValueError as exc:
                log.warning("ingest.bad_line", extra={"line": number,
                                                      "error": str(exc)[:120]})


async def ingest_cases(records: Iterable[Dict[str, Any]], *,
                       batch_size: int = 32) -> IngestStats:
    stats = IngestStats()
    await ensure_collection(CASE_LAWS)
    client = get_client()
    batch: List[Dict[str, Any]] = []

    async def flush() -> None:
        if not batch:
            return
        vectors = await llm.embed([embedding_text(p) for p in batch])
        await client.upsert(
            collection_name=CASE_LAWS,
            points=[
                qm.PointStruct(id=stable_point_id(p["citation_id"]),
                               vector=vector, payload=p)
                for p, vector in zip(batch, vectors)
            ],
            wait=True,
        )
        stats.written += len(batch)
        log.info("ingest.batch", extra={"written": stats.written})
        batch.clear()

    for raw in records:
        stats.read += 1
        payload = build_case_payload(raw)
        if payload is None:
            stats.skip("missing citation_id or case_name")
            continue
        if not payload["verified"]:
            # Refuse quietly rather than indexing something we would never
            # cite. An untrusted source is a configuration mistake.
            stats.skip(f"untrusted source: {payload['provenance']['source']}")
            continue
        if not (payload["summary"] or payload["holding"]):
            stats.skip("no substantive text to embed")
            continue
        batch.append(payload)
        if len(batch) >= batch_size:
            await flush()
    await flush()
    return stats


async def ingest_statutes(records: Iterable[Dict[str, Any]],
                          *, batch_size: int = 32) -> IngestStats:
    stats = IngestStats()
    await ensure_collection(STATUTES)
    client = get_client()
    batch: List[Dict[str, Any]] = []

    async def flush() -> None:
        if not batch:
            return
        texts = [
            f"{p['code']} section {p['section']}. "
            f"{(p['reference'] or {}).get('definition', '')}"
            for p in batch
        ]
        vectors = await llm.embed(texts)
        await client.upsert(
            collection_name=STATUTES,
            points=[
                qm.PointStruct(id=stable_point_id(f"{p['code']}:{p['section']}"),
                               vector=vector, payload=p)
                for p, vector in zip(batch, vectors)
            ],
            wait=True,
        )
        stats.written += len(batch)
        batch.clear()

    for raw in records:
        stats.read += 1
        payload = build_statute_payload(raw)
        if payload is None:
            stats.skip("missing section")
            continue
        batch.append(payload)
        if len(batch) >= batch_size:
            await flush()
    await flush()
    return stats


async def purge(collection: str) -> int:
    """Delete every point in a collection.

    Needed once, to remove the fabricated 'precedent' the old generate-then-
    persist path wrote into the shared corpus.
    """
    client = get_client()
    if not await client.collection_exists(collection):
        return 0
    from app.core.qdrant_client import count

    before = await count(collection)
    await client.delete(
        collection_name=collection,
        points_selector=qm.FilterSelector(filter=qm.Filter(must=[])),
        wait=True,
    )
    log.warning("ingest.purged", extra={"collection": collection, "removed": before})
    return before


async def _main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="VaadVivaad corpus ingest")
    parser.add_argument("--source", type=Path, help="JSONL file of records")
    parser.add_argument("--kind", choices=["cases", "statutes"], default="cases")
    parser.add_argument("--purge", action="store_true",
                        help="delete every point in the target collection first")
    parser.add_argument("--yes", action="store_true", help="skip the purge prompt")
    args = parser.parse_args(argv)

    configure("INFO", console=True)
    collection = CASE_LAWS if args.kind == "cases" else STATUTES

    if args.purge:
        if not args.yes:
            reply = input(f"Delete ALL points in '{collection}'? [y/N] ")
            if reply.strip().lower() not in ("y", "yes"):
                print("aborted")
                return 1
        removed = await purge(collection)
        print(f"purged {removed} points from {collection}")

    if args.source:
        if not args.source.exists():
            print(f"no such file: {args.source}", file=sys.stderr)
            return 2
        records = read_records(args.source)
        stats = (await ingest_cases(records) if args.kind == "cases"
                 else await ingest_statutes(records))
        print(json.dumps(stats.as_dict(), indent=2))
        if stats.skipped:
            print("\nSkipped records are usually an untrusted `source` field. "
                  f"Trusted sources: {', '.join(sorted(TRUSTED_SOURCES))}")
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(_main()))
