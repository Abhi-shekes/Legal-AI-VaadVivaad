# VaadVivaad Backend

FastAPI + Socket.IO API for VaadVivaad. Handles auth, case intake, Qdrant
vector search (case law / IPC sections / evidence), Gemini-generated debate
arguments, and the real-time debate flow over Socket.IO.

> Running the full stack (this + the frontend + MongoDB + Qdrant) via
> Docker is documented in the [root README](../README.md) — start there
> unless you specifically need to run just this service on the host.

## Stack

FastAPI, Socket.IO (`python-socketio`), Motor (async MongoDB driver),
Qdrant (`langchain-qdrant`) for self-hosted vector search, Google Gemini
(`google-genai`) for both argument generation and embeddings, JWT auth via
`python-jose`.

## Run standalone (without Docker)

Requires a running MongoDB instance, a running Qdrant instance
(`docker run -p 6333:6333 qdrant/qdrant:v1.19.1`), and Python 3.11+.

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # if present, else see required vars below
uvicorn app.main:sio_app --reload --host 0.0.0.0 --port 8000
```

Note the entrypoint is `app.main:sio_app`, **not** `app.main:app` — `app`
is the bare FastAPI instance; `sio_app` wraps it with the Socket.IO ASGI
app that the debate flow depends on entirely.

Required environment variables (see `app/core/config.py` for the full,
authoritative list): `MONGO_URL`, `DB_NAME`, `JWT_SECRET_KEY`,
`GOOGLE_API_KEY`. `QDRANT_URL` defaults to `http://localhost:6333`.
`GOOGLE_API_KEY` can technically be left as a placeholder string — those
endpoints degrade to empty results / a clean error instead of crashing —
but note it's required for *both* the debate-argument generation *and* the
Qdrant search embeddings, so leaving it as a placeholder disables more than
just one feature. Only auth/user endpoints need `MONGO_URL`/
`JWT_SECRET_KEY` to work without it.

## Structure

```
app/
  api/routes/        HTTP + Socket.IO route handlers (auth, user, vectordb, gemini)
  controller/         Gemini prompt construction + Qdrant search logic
  core/                Settings (config.py), Gemini client (model_config.py),
                        embeddings (embeddings.py), Qdrant client (qdrant_client.py)
  db/                  Motor/MongoDB client
  schemas/             Pydantic request/response models
  auth/, utils/        Password hashing, JWT issuance, auth dependency,
                        vector-store ingest helpers (save*.py)
  socket_instance.py   Shared Socket.IO server instance (avoids circular imports)
  main.py              FastAPI app assembly; exports both `app` and `sio_app`
```

## Vector search

Three Qdrant collections — `case_laws`, `ipc_sections`, `evidence_type` —
created automatically on first use (`app/core/qdrant_client.py`). Text is
embedded via Gemini (`app/core/embeddings.py`) before being written to or
queried from Qdrant, using task-specific `RETRIEVAL_DOCUMENT` /
`RETRIEVAL_QUERY` embeddings. Collections start empty; use the `save*`
helpers in `app/utils/` to ingest real data.

## API docs

With the server running: `http://localhost:8000/docs` (Swagger UI) or
`/redoc`.
