# VaadVivaad Backend

FastAPI + Socket.IO API for VaadVivaad. Runs the adversarial hearing: case
intake and screening, IPC ↔ BNS statute routing, hybrid precedent retrieval
over a verified corpus, a durable state-machine debate between counsel, a
reasoned order from the bench, and the post-order audit, consult, translation
and export surface.

> Running the full stack (this + the frontend + Mongo + Qdrant + Redis) via
> Docker is documented in the [root README](../README.md) — start there unless
> you specifically need to run just this service on the host.

## Stack

FastAPI, `python-socketio`, Motor (async MongoDB), `qdrant-client` /
`fastembed` for hybrid vector search, `google-genai` for argument generation
and (by default) embeddings, `python-jose` for JWT, optional `redis` for
shared state across replicas. Tests are stdlib `unittest`.

## Run standalone (without Docker)

Requires MongoDB, Qdrant (`docker run -p 6333:6333 qdrant/qdrant:v1.19.1`),
and Python 3.11+. Redis is optional.

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# see the required vars below, or copy a filled-in .env
uvicorn app.main:sio_app --reload --host 0.0.0.0 --port 8000
```

The entrypoint is **`app.main:sio_app`**, not `app.main:app` — `app` is the
bare FastAPI instance; `sio_app` is the Socket.IO ASGI wrapper the hearing
depends on entirely.

Required environment (see `app/core/config.py` for the authoritative list):
`MONGO_URL`, `DB_NAME`, `JWT_SECRET_KEY` (≥ 32 chars), `GOOGLE_API_KEY`.
`QDRANT_URL` defaults to `http://localhost:6333`; `REDIS_URL` empty falls back
to per-process in-memory implementations. Auth/user endpoints work without a
valid `GOOGLE_API_KEY`; anything that generates argument or embeds text
degrades to a clean error.

## Structure

```
app/
  main.py                 App assembly; exports `app` and `sio_app`. Health,
                          /ready, /metrics, error handlers, lifespan wiring.
  socket_instance.py      Shared Socket.IO server (avoids circular imports).
  sockets/debate.py       Handshake auth, room join, hearing runner + replay.

  api/
    deps.py               Identity, rate-limit dependencies.
    routes/auth.py        signup / login / refresh (rotating) / me / logout.
    routes/cases.py       The case surface — create, upload, argue, object,
                          continue, consult, timeline, outside, brief,
                          translate, transcribe, turn audio, search, statute.

  core/
    config.py             Pydantic settings, one source of truth.
    llm.py                Async Gemini client: structured output, backoff,
                          per-model circuit breaker, token ledger, caching,
                          two tiers (FAST / REASONING).
    embeddings.py         Dense (Gemini | local TEI) + BM25 sparse + optional
                          cross-encoder reranker, each behind a seam.
    qdrant_client.py      Collections (case_laws, statutes, case_documents),
                          created on boot. The only writer is ingest.
    ratelimit.py, store.py  Redis-backed with in-memory fallback.
    errors.py, logging.py, metrics.py   One error shape, request-scoped
                          structured logs, Prometheus text (no dependency).

  domain/schemas.py       Every Pydantic model: CaseStructure, SectionCandidate,
                          Precedent, ArgumentTurn, TurnRecord, BenchRuling,
                          EvidenceGapReport, StrengthAssessment, ScopeAssessment…

  security/prompting.py   System-prompt construction, user-text fencing,
                          the injection canary.

  services/
    guard.py              Scope / welfare / injection / abuse screening.
    intake.py             Prose → confirmed CaseStructure; section candidates.
    documents.py          FIR / chargesheet / notice / bail order → CaseStructure.
    concordance.py        IPC ↔ BNS routing by incident date. Data, never model.
    retrieval.py          Hybrid precedent search + rerank + legal features.
    authority.py          Citation graph — is this authority still good law?
    casefile.py           Per-case document RAG (Qdrant, debate_id-partitioned).
    timeline.py           Deterministic + model contradiction detection.
    citations.py          Verify every cited authority against the shortlist.
    analysis.py           Evidence gaps, case strength, user-argument scoring.
    consult.py            Post-order questions to the bench / either counsel.
    translation.py        12-language intake and transcript rendering.
    voice.py              Whisper (STT) + Piper (TTS), both optional.
    websearch.py          SearXNG "outside the record" — never citable.
    search.py             Record search: Meilisearch, or Mongo text fallback.
    export.py             Case brief → PDF / DOCX / HTML.
    debate/
      machine.py          The state machine. Construct, `await run()`.
      context.py          Four-tier context assembly + the claim ledger.
      personas.py         Counsel and Bench prompts.
    ingest/
      pipeline.py         Corpus ingest CLI — the only thing that writes Qdrant.
      harvest/            Polite fetchers for the free official publishers.
    checks/concordance_check.py   CI gate: no "verified" concordance entry
                          without a recorded reviewer.

  auth/                   Password hashing (bcrypt), JWT issuance.
  db/                     Motor client; repository (users, debate state,
                          refresh tokens, preferences) + index creation.
```

## The hearing

`DebateMachine` drives one hearing as explicit stages — `structuring →
researching → arguing → ruling → analysing → done` — each a coroutine that
takes the state and returns the next. State is persisted after every
committed turn, so a hearing resumes from where it stopped (a dropped socket,
a backend restart, or the user reopening the case). The token ledger charges
every step and the whole run has a ceiling; on budget exhaustion it still
tries to deliver an order rather than discarding the argument.

Schedule: prosecution then defence across `opening`, `evidence`, `rebuttal`,
`closing`; rounds scale with the complexity of the matter. "Further
submissions" alternate the two sides for as long as they are granted (up to
three grants), and the prior order is moved to `prior_rulings` rather than
overwritten.

## Retrieval

Three Qdrant collections, created on boot (`app/core/qdrant_client.py`):

| Collection | Holds |
|---|---|
| `case_laws` | Ingested judgments — dense + BM25 sparse vectors, provenance, `verified` flag. |
| `statutes` | IPC / BNS section text, looked up by payload filter (no embedding cost). |
| `case_documents` | Per-hearing uploaded documents, chunked and page-anchored, partitioned by a `debate_id` payload filter. |

`find_precedents()` runs a dense query and a BM25 query, fuses the two by
reciprocal rank, optionally blends a cross-encoder score (`RERANK_WEIGHT`)
with the deterministic legal features (section overlap, court seniority,
recency), and applies a similarity floor. Every layer degrades: no
`fastembed` → dense-only; no reranker URL → features only; no Qdrant → empty
list and a hearing argued from statute alone.

## Corpus ingest

The corpus starts empty and **nothing on the request path writes to it**.
Load real judgments with:

```bash
python -m app.services.ingest.pipeline --source fixtures/seed_corpus.jsonl
# harvest from the free official publishers:
python -m app.services.ingest.pipeline --harvest indiacode --recreate
```

Ingest is idempotent, strips instruction-shaped text before indexing, and
marks `verified` only for documents from a declared curated source.

## API docs

With the server running: `http://localhost:8000/docs` (Swagger) or `/redoc`.

## Tests

```bash
python -m unittest discover -s tests -t . -v
python -m app.services.checks.concordance_check   # concordance integrity gate
```
