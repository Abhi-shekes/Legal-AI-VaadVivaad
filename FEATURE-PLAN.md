# VaadVivaad — ten features, zero licence cost

Everything below is free software or a local Docker service. Gemini stays the
only external account, and three of these features exist specifically to make
it optional.

Host budget this was sized against: 12 cores, 15.3 GB RAM (~6 GB free),
RTX 3050 Laptop (4 GB VRAM).

---

## Where the stack actually stands

- Retrieval is **dense-only**: one Gemini embedding, one Qdrant query,
  `score_threshold=0.55`, then a hand-written feature reranker
  (`app/services/retrieval.py`).
- The corpus is **empty by default**. `TRUSTED_SOURCES` names six free
  official publishers in `app/services/ingest/pipeline.py`, but nothing
  fetches from any of them — ingest reads a hand-written JSONL and
  `fixtures/seed_corpus.jsonl` holds a handful of landmarks.
- **One external service.** `config.py` pins both model tiers to
  `gemini-flash-lite-latest` because it is the only tier whose free quota can
  finish a hearing. `_trip_circuit` in `llm.py` exists because 429s land
  mid-debate.
- Uploaded documents are **read once and discarded** (`documents.py`).
- There is **no search** over a user's own cases — `list_debates` is a
  `find(limit=50)`, and Mongo Community has no Atlas Search.

The architecture is already right: retrieval-only Qdrant, citation
verification against the retrieved shortlist, a token ledger, a durable state
machine. What is missing is depth of corpus, quality of retrieval, and
independence from one API key.

---

## Wave 1 — no new containers

### F-01 · Hybrid retrieval (sparse + dense, fused in Qdrant)

**Now.** `find_precedents()` runs a single dense query. Legal text turns on
exact tokens — `302`, `BNS 103`, `Section 27 Evidence Act`, a case name —
and dense vectors blur exactly those. `normalise_section()` exists in that
same file *because* the literal string matters.

**Build.** Add a named sparse vector to `case_laws`, produced by `fastembed`'s
BM25 (`Qdrant/bm25`) at ingest. Query becomes Qdrant's Query API with
`prefetch` over both vectors and `FusionQuery(fusion=RRF)` — one round trip,
server-side fusion. Keep the existing `rerank()` on top of the fused list.

**Stack.** `fastembed` (Apache-2.0, in-process, no service). Qdrant 1.19
already supports sparse vectors and RRF.

**Touches.** `app/core/qdrant_client.py` (`sparse_vectors_config` in
`ensure_collection`), `app/services/retrieval.py`, `app/services/ingest/pipeline.py`,
`requirements.txt`. Requires a re-ingest.

**Effort.** Small. **Depends on.** Nothing.

---

### F-02 · Corpus harvesting from the free official sources

**Now.** The six trusted sources are declared and unused. For almost any real
case `find_precedents()` returns `[]` and the hearing degrades to
statute-only — correct behaviour, but it means the product's central claim
(argument backed by real precedent) is unfunded.

**Build.** `app/services/ingest/harvest/` with one adapter per publisher —
`sci.py` (Supreme Court judgment portal), `indiacode.py` (bare acts),
`ecourts.py`, `egazette.py` — each emitting exactly the record shape
`build_case_payload()` already validates, so `pipeline.py` is untouched.
A polite fetcher underneath: `urllib.robotparser` check, per-host token
bucket, on-disk HTTP cache keyed on ETag, resumable checkpoints in Mongo.
Docling (MIT, IBM) parses judgment PDFs into structured text with headings
and page anchors. Ships as a `harvester` compose profile plus a cron entry.

**Stack.** `httpx` (already a dependency), `docling`, `selectolax`. No paid
database, no commercial legal API.

**Effort.** Large — and the highest payoff on this list. Every other
retrieval feature is quality work on an empty shelf until this runs.

---

## Wave 2 — one model server

### F-03 · Local embeddings + a real cross-encoder reranker

**Now.** The `rerank()` docstring says it plainly: `bge-reranker-v2-m3` is the
intended upgrade and "no model weights can be downloaded in this
environment." That constraint is gone. Meanwhile every embedding is a Gemini
call — a 10,000-judgment ingest is 10,000 quota'd requests, and `llm.embed()`
failing takes retrieval with it.

**Build.** Hugging Face **Text Embeddings Inference** (Apache-2.0) as one
container serving `BAAI/bge-m3` (1024-d, multilingual — it covers the
Hindi/Marathi/Bengali intake `translation.py` already supports), and a second
TEI container serving `BAAI/bge-reranker-v2-m3`. New `app/core/embeddings.py`
with an `EMBEDDING_PROVIDER=gemini|local` seam. `rerank()` blends
0.6 × cross-encoder score with 0.4 × the existing legal features, so section
overlap and court seniority survive the upgrade rather than being replaced by
an opaque model.

**Watch out.** `EMBEDDING_DIMENSIONS` moves 768 → 1024; the `case_laws`
collection must be recreated and re-ingested. Do it in the same pass as F-01.

**GPU.** bge-m3 at fp16 is ~2.3 GB — fits the 3050. Pin the reranker to CPU;
12 cores handle 8 candidates in well under 100 ms.

**Effort.** Medium. **Depends on.** Nothing, but pairs with F-01.

---

### F-04 · Citation graph — authority chains and negative treatment

**Now.** `Precedent.citation_id` exists; nothing links one judgment to
another. `citations.verify_turn()` proves an authority was *retrieved*.
Nothing proves it is still *good law* — counsel can cite a judgment overruled
in 2018 and the verifier passes it clean.

**Build.** Extract case → case edges at ingest (regex over judgment text,
resolved against `citation_id`), and classify the treatment once at ingest:
followed / distinguished / doubted / overruled. Store as a Mongo `citations`
collection `(source, target, treatment, para)` — the queries needed are one
or two hops, so a graph database is not required. Neo4j Community in Docker
is the upgrade path if you want the visual browser.

**Unlocks.** A treatment flag beside every precedent in the hearing UI; 1-hop
authority expansion after `rerank()`; citation in-degree as a new ranking
feature next to `court_rank`.

**Effort.** Medium. **Depends on.** F-02 (needs judgment text to mine).

---

### F-05 · Per-case document RAG — the whole file, not one PDF

**Now.** `documents.py` accepts one upload, extracts a `CaseStructure`, and
drops the bytes. A real matter is an FIR *plus* a chargesheet *plus* witness
statements *plus* a medical report *plus* a bail order, and nothing
downstream can quote any of it.

**Build.** A third Qdrant collection, `case_documents`, single-collection
multitenancy with a `debate_id` keyword payload index as the tenant boundary
(Qdrant's own recommended shape). Docling layout-aware chunking with page
anchors; embedded by F-03's local model, so a 200-page file costs nothing.
`DebateContext.assemble()` gains a per-phase retrieval of the three most
relevant own-file passages, and quoted passages are verified page-anchored
the same way `citations.verify_turn()` verifies precedent.

**Effort.** Large. **Depends on.** F-03.

---

## Wave 3 — independence and surface

### F-06 · Local LLM fallback (Ollama)

**Now.** Both tiers are flash-lite, by necessity. One rate limit ends a
hearing.

**Build.** Ollama in compose. `LLMClient._call_with_retry` gains a provider
fallback: when the circuit trips or a 429 returns, retry the same structured
call against a local model through Ollama's OpenAI-compatible endpoint with
the same JSON schema. Route the cheap, high-volume, schema-shaped steps —
`guard.screen`, `intake.extract_structure`, `evidence_profile`,
`translation` — to local by default, and keep Gemini for the reasoning tier
(bench ruling, counsel turns).

**GPU.** 4 GB VRAM fits `qwen3:4b` or `gemma3:4b` at q4. Larger needs CPU
offload.

**Payoff.** Quota exhaustion becomes a degraded-but-complete hearing instead
of a failed one, and the UI can label which turns were generated locally.

**Effort.** Medium.

---

### F-07 · Contradiction and timeline engine

**Now.** `analysis.py` derives evidence gaps and case strength from the claim
ledger. Nothing reads the *facts* against each other.

**Build.** On top of F-05. Extract `(actor, action, time, place, source_doc,
page)` assertions from every document in the file, then detect contradictions
pairwise with an NLI cross-encoder on TEI
(`MoritzLaurer/DeBERTa-v3-base-mnli`) rather than an LLM — cheaper,
deterministic, no quota. Add a rule pass for timeline impossibilities: an FIR
timestamped before the incident, a witness in two places, a date that moves
between statements. Output a timeline view and a `contradictions` field that
`personas.py` tells defence counsel to work with.

**Effort.** Large. **Depends on.** F-03, F-05. The feature that most obviously
reads as a practitioner's tool rather than a demo.

---

### F-08 · Instant search over the user's own record (Meilisearch)

**Now.** No search of any kind over cases, turns, rulings or consultations.

**Build.** Meilisearch (MIT, ~150 MB resident) indexing all four, with a
**tenant token** scoped to `user_id` so a search key can never reach another
user's matter. `GET /user/search?q=` with facets on section, court, outcome
and year. Frontend: a ⌘K palette in `layouts/AppShell.jsx`, reusing
`RecentCasesList` for result rows.

**Effort.** Medium.

---

### F-09 · Live grounding via self-hosted SearXNG

**Now.** The corpus is a snapshot. A judgment from last month or a 2026
amendment is invisible.

**Build.** SearXNG (AGPL-3, one container, no API key) restricted to an
allowlist of official domains. New `app/services/websearch.py`. Results enter
as **unverified** and surface in a separate "Outside the record" panel —
never handed to counsel as citable authority. That preserves the trust
boundary `qdrant_client.py` is built around: the application never writes to
the corpus, and only curated ingest can mark anything verified.

**Effort.** Small to medium.

---

### F-10 · Voice — dictation in, hearing read out

**Now.** `translation.py` opens with "A person describing a police matter will
not do it in a second language," and supports en/hi/mr/bn and more. The only
input in `Pages/Case.jsx` is a textarea. That contradiction is the feature.

**Build.** faster-whisper (MIT) behind an OpenAI-compatible
`/v1/audio/transcriptions` container; `large-v3` int8 on CPU or `medium` on
the 3050 handles the Indic languages well. Transcript flows into the existing
`translation.to_english` → `intake.prepare` path, so nothing downstream
changes. Out: Piper TTS (MIT, ~50 MB, faster than realtime on CPU) with a
distinct voice per persona, so prosecution, defence and bench are audibly
separate as `sockets/debate.py` streams `turn_complete`.

**Effort.** Medium.

---

## Resource budget

| Service | Image | RAM | VRAM |
|---|---|---|---|
| TEI — bge-m3 | `ghcr.io/huggingface/text-embeddings-inference` | ~1.5 GB | 2.3 GB (optional) |
| TEI — reranker + NLI | same image, CPU | ~1.2 GB | — |
| Ollama — qwen3:4b-q4 | `ollama/ollama` | ~1.0 GB | 3.2 GB |
| Meilisearch | `getmeili/meilisearch:v1.11` | ~150 MB | — |
| SearXNG | `searxng/searxng` | ~200 MB | — |
| faster-whisper | `fedirz/faster-whisper-server` | ~1.5 GB | 1.5 GB (optional) |
| Piper TTS | `rhasspy/wyoming-piper` | ~150 MB | — |

Everything at once is ~5.7 GB on top of the current four containers, against
~6 GB free. Two consequences: adopt in waves, and do not put TEI, Ollama and
Whisper on the 4 GB GPU together — give the GPU to Ollama and leave the
encoders on CPU, where 12 cores are more than enough.

---

## Worth doing alongside

- **Langfuse** (self-hosted, MIT core) tracing on `LLMClient.generate/stream`
  — the token ledger already counts, but nothing shows *where* the tokens go.
- **A retrieval eval set** (promptfoo or ragas) of ~50 case → expected-authority
  pairs, so F-01 and F-03 are measurable rather than a matter of opinion.
- **arq** on the Redis already in compose, so `_run()` in `sockets/debate.py`
  survives a backend restart instead of dying with the process.
