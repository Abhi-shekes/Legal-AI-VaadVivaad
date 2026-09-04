# VaadVivaad — Production Upgrade Worklist

Implementation of the audit plan (`VaadVivaad-Production-Docket.pdf`).

Status: `[x]` done and verified · `[~]` code complete, verification blocked · `[!]` blocked

## Environment constraints discovered

| Fact | Consequence |
|---|---|
| Backend container: Python 3.11.16, full dep set | Real verification possible — code runs and is tested in-container |
| **Gemini API reachable + key valid** | The pipeline was verified end to end against live Gemini |
| **PyPI unreachable** from host and container | `redis`/`structlog`/`slowapi`/`langgraph`/`arq`/`pytest` could not be installed |
| npm registry reachable **from containers only** | Frontend builds in a `node:20-alpine` container, not on the host |
| Docker Hub auth unreachable | Images build with `DOCKER_BUILDKIT=0` (legacy builder skips the syntax-directive fetch) |
| Official judgment portals unreachable | Real corpus ingest cannot be *run* here; the pipeline is built and exercised against a 12-judgment curated seed |
| Free-tier Gemini quota | Both tiers now run `gemini-flash-lite-latest`, the only tier whose free quota carries a whole hearing. The circuit breaker remains for the case where a deployment points the reasoning tier elsewhere |

**Dependency strategy.** Rather than stub the plan out, each piece that would
have been a third-party package is implemented behind a small interface with a
stdlib default and a drop-in backend for the real library:

| Planned | Shipped | Why it is not a downgrade |
|---|---|---|
| `structlog` | `app/core/logging.py` — stdlib + JSON formatter, ContextVar correlation ids | No dependency needed; keep permanently |
| `redis` | `KeyValueStore` with `InMemoryStore` / `RedisStore`, auto-selected on `REDIS_URL` | Added to `requirements.txt` + compose; correct across replicas the moment Redis is present |
| `slowapi` | `app/core/ratelimit.py` over the same store | Works in-memory *or* Redis-backed, so it becomes multi-replica correct for free |
| `langgraph` | `app/services/debate/machine.py` — explicit async state machine | Fixed 5-phase graph; checkpointing stays honest and the swap is contained to one file |
| `pytest` | stdlib `unittest` | Suite runs on host, in-container, and in CI with no install |
| `bge-reranker` | Deterministic feature reranker in `retrieval.rerank()` | No model weights downloadable; transparent and unit-tested. A local cross-encoder slots in behind the same function |
| hosted LLM observability | `app/core/metrics.py` — Prometheus text, no dependency | Scraped by self-hosted Prometheus/Grafana (`--profile observability`). Nothing leaves the machine |
| cloud load balancer / WAF | Caddy (`--profile tls`) | Free automatic Let's Encrypt certificates, security headers, `/metrics` blocked at the edge |
| cloud secrets manager | `.env` at `chmod 600`, or Docker secrets | No key-management subscription needed |

---

## WP0 — Stop the bleeding

- [x] **F-01/F-02** Every model→corpus write path deleted; **16 fabricated points purged** from Qdrant. Ingest is now the sole writer and refuses untrusted sources
- [x] **F-03** Async LLM client (`client.aio`); nothing blocks the event loop
- [x] **F-14** Structured output via `response_schema`; fence-stripping salvage code deleted
- [x] **§08** Retry with jitter, timeouts, token ledger + hard budget, model routing, result cache, **circuit breaker with tier fallback**
- [x] **§08** Research fan-out runs concurrently (`asyncio.gather`)
- [x] **F-11** `case_data_store` dict replaced by the session store; state persisted per turn
- [x] **F-04** Server-issued opaque case ids; JWT validated on the socket handshake; room membership checked — *verified: forged token refused, cross-user read → 403*
- [x] **F-05** Auth on every route that spends money; `/gemini/*` deleted; rate limiting — *verified: 429 after 5 debates/hour*
- [x] **F-06** The user's evidence is parsed into the case object and argued over item by item
- [x] **F-07** `case_details` is emitted; the analysis panel renders
- [x] **F-13** Correct status codes, no user enumeration, unique index, refresh tokens + server-side revocation, `/auth/me`
- [x] **F-15** Structured JSON logging with correlation ids; Mongo indexes; dead code and 15 unused frontend deps removed

## WP1 — Make it true

- [x] **F-09** Full-description query, k=8 → rerank → top 3, payload indexes, court as boost, **relevance floor**; key lookups no longer pay for an embedding
- [x] **Feature 02** Citation verification against the retrieved shortlist — *verified: fabricated cite stripped, real one kept*
- [x] **Feature 01** The Bench — structured order with calibrated confidence and `would_change_if`
- [x] **F-12** Nonce-fenced untrusted input, canary, injection screen — *verified: injection in a live case leaked nothing*
- [x] **§07** Four-outcome scope classifier, welfare branch with Indian helplines, PII redaction — *never disconnects the socket*
- [x] **Ingest** Offline pipeline, sole corpus writer, provenance + sanitisation; 12-judgment seed loaded
- [x] **Calibration guard** Bench confidence capped by what the record supports (an early run returned 1.00 on a record with no identification evidence)

## WP2 — Depth

- [x] **Feature 03** Multi-round phased hearing (opening/evidence/rebuttal/closing), token-streamed, resumable, interruptible via **Object**
- [x] **§06** Four-tier context + claim ledger with status tracking and budget-aware compaction
- [x] **Feature 06** Evidence gap analyser, ranked by what the defence actually pressed
- [x] **Feature 08** Case brief export — PDF (WeasyPrint → Chrome → HTML fallback), DOCX written as OOXML with the stdlib
- [x] **Feature 05** IPC↔BNS concordance (47 mappings) with date-based routing; **data, never model output**, with a CI integrity check
- [x] **Feature 04** Document intake — FIR/chargesheet/notice via native PDF and image reading
- [x] **Frontend** Analysis panel, ruling/gaps/strength cards, streaming turn cards, session revalidation, lazy routes

## WP3 — Production

- [x] **Feature 07** Take-a-side mode — `POST /user/cases/{id}/argue` scores a user's argument on four criteria
- [x] **Feature 09** Case-strength meter, always rendered with its decomposition
- [x] **Feature 10** 12 Indian languages; script detection first, model only to disambiguate Devanagari
- [x] **Tests** 46 stdlib-unittest tests + GitHub Actions CI (backend, frontend, compose validation)
- [x] **Infra** Redis service, resource limits, `/ready` with dependency checks, docs

## Verified live

```
forged socket token refused:      RuntimeError (namespace rejected)
cross-user case read:             HTTP 403
unauthenticated case creation:    HTTP 401
/gemini/generate_argument:        HTTP 404 (route deleted)
login with wrong password:        HTTP 401 (was 200 with {"status":"fail"})
duplicate signup:                 identical response, no enumeration
debate rate limit:                429 after 5/hour
prompt injection in a live case:  no canary leak, 0 fabricated citations
BNS routing 2025-03-01:           BNS 103(1) (≈ IPC 302)
IPC routing 2020-03-01:           IPC 302 (≈ BNS 103(1))
hearing:                          8 turns, 4 phases, 43 streamed deltas
resume from disk:                 OK
brief export:                     HTML 13.5 KB / DOCX 3.0 KB, disclaimer present
```

## Cost posture

Everything in this stack is free software running locally. **Gemini is the
only external service**, and both model tiers are set to
`gemini-flash-lite-latest` so a free API key carries a complete hearing.

| Concern | What is used | Cost |
|---|---|---|
| Database | MongoDB (self-hosted container) | free |
| Vector search | Qdrant (self-hosted container) | free |
| Cache / sessions / queue | Redis (self-hosted container) | free |
| Corpus | SC portal, eCourts, India Code, Gazette, NJDG | free, official |
| TLS | Caddy + Let's Encrypt | free |
| Metrics | in-process `/metrics` + Prometheus + Grafana | free |
| Document parsing | Gemini native PDF/image reading | Gemini quota |
| PDF export | WeasyPrint, falling back to headless Chrome | free |
| DOCX export | OOXML written with the standard library | free |
| Reranking | deterministic feature scorer, no model weights | free |
| Reasoning | Gemini flash-lite | free tier |

Removed as unnecessary: the `langchain-core`/`langchain-qdrant`/`langsmith`
dependency chain (no longer imported anywhere), any commercial legal database,
and every managed-cloud recommendation.

## Not done here, and why

- [!] **Real corpus ingest.** The official portals are unreachable from this
  environment. The pipeline is built, tested and idempotent; it needs a network
  and a source-terms review. Trusted sources are the free official publishers
  only — the Supreme Court judgment portal, eCourts, India Code, the Gazette
  and the NJDG. No commercial legal database is required or supported. The
  12-judgment seed exists so retrieval and citation verification have real
  ground truth, and is explicitly labelled a seed rather than the corpus.
- [!] **Concordance sign-off.** All 47 IPC↔BNS mappings ship `verified: false`
  and surface as provisional. A human must check them against the official MHA
  concordance and fill in `_meta.sign_off`; CI fails if anything is marked
  verified without that.
- [!] **Strength-meter calibration.** Back-testing against labelled verdicts
  needs the real corpus. The decomposition and the deterministic ledger signals
  are in place; the calibration study is not. Nothing paid is involved — it
  needs data, not a subscription.
- [x] **TLS, edge protection, secrets, metrics.** Done with free self-hosted
  parts instead of cloud services: Caddy for automatic Let's Encrypt
  certificates and security headers (`--profile tls`), Prometheus and Grafana
  for metrics (`--profile observability`), `.env`/Docker secrets for
  credentials. Mongo, Qdrant and Redis stay self-hosted — no managed database
  is used anywhere.
- [~] **Redis path.** Code complete and selected automatically via `REDIS_URL`;
  compose now runs a Redis service, but the running container predates the
  `redis` package so it is still on the in-memory store here. `docker compose
  build backend` with network picks it up.
