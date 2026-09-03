# VaadVivaad

**AI-simulated legal debate platform.** Submit a case, and watch an AI
courtroom argue it — backed by real precedent search over Indian case law
and IPC sections, with every debate saved to your case history.

Four services, one `docker compose up` — fully self-hosted, no managed
cloud database required:

```
┌──────────────────────┐        ┌───────────────────────┐        ┌────────────────┐
│  vaadvivaad-frontend  │──────▶│  vaadvivaad-backend     │──────▶│ vaadvivaad-mongo │
│  React 18 + Vite      │  HTTP  │  FastAPI + Socket.IO    │ Motor  │  MongoDB 7       │
│  served by nginx      │  & WS  │  (auth, cases, debate)   │        │  (auth-protected)│
└──────────────────────┘        └────────────┬────────────┘        └────────────────┘
                                              │
                               ┌──────────────┴──────────────┐
                               │                              │
                    ┌──────────▼──────────┐        ┌──────────▼──────────┐
                    │  vaadvivaad-qdrant   │        │   Google Gemini      │
                    │  Vector search        │        │   (external API)      │
                    │  (self-hosted)         │        │   arguments + embeds  │
                    └──────────────────────┘        └──────────────────────┘
```

## Quick start

```bash
cp .env.example .env
# edit .env: at minimum set JWT_SECRET_KEY (e.g. `openssl rand -hex 32`)
docker compose up --build -d
```

- Frontend: http://localhost:8081
- Backend API: http://localhost:8000 (Swagger docs at `/docs`, health at `/health`)
- Qdrant dashboard: http://localhost:6333/dashboard (inspect collections/points)
- MongoDB: internal only, auth-protected, data persisted in the
  `vaadvivaad-mongo-data` volume

Signup, login, dashboard, and case history work immediately. Qdrant itself
is fully self-hosted and needs no external account — but it starts with
empty collections, and the AI-powered features (similar-case/IPC vector
search, Gemini-generated debate arguments) only produce real results once
you set a real `GOOGLE_API_KEY` in `.env` (Gemini both generates the
arguments and computes the embeddings Qdrant searches against) and seed
some data in. Without a key, those endpoints degrade gracefully (empty
results / a clean "server busy" error) instead of crashing anything else.

```bash
docker compose logs -f            # tail all services
docker compose ps                 # status + healthcheck state
docker compose down                # stop (add -v to also drop the Mongo volume)
```

## Project layout

```
VaadVivaad-Legal-AI/
├── docker-compose.yml       Orchestrates all three services
├── .env.example              Template for the required/optional env vars
├── vaadvivaad-backend/        FastAPI + Socket.IO API           → see its README
└── vaadvivaad-frontend/       React + Vite SPA                   → see its README
```

`vaadvivaad-backend/` and `vaadvivaad-frontend/` are independent git repos
(no top-level VCS ties them together); each has its own README with
component-specific setup, structure, and standalone (non-Docker) run
instructions.

## Services

| Container              | Image                    | Role                              | Runs as   |
|-------------------------|--------------------------|------------------------------------|-----------|
| `vaadvivaad-mongo`      | `mongo:7`                | Database (users, saved debates), auth-protected | `mongodb` |
| `vaadvivaad-qdrant`     | `qdrant/qdrant:v1.19.1`  | Vector search (case laws, IPC sections, evidence types) | `qdrant` |
| `vaadvivaad-backend`    | `vaadvivaad-backend`     | FastAPI + Socket.IO API            | non-root `vaadvivaad` (uid 1001) |
| `vaadvivaad-frontend`   | `vaadvivaad-frontend`    | Static SPA behind nginx            | non-root `nginx` (unprivileged image) |

All four sit on a dedicated `vaadvivaad-network` bridge network, with
healthchecks gating startup order (`frontend` waits on `backend` waits on
`mongo` + `qdrant`), `restart: unless-stopped`, resource limits, and
rotated JSON logging (10 MB × 3 files/service).

## Configuration

Every variable is documented inline in [`.env.example`](.env.example).
Highlights:

| Variable | Required | Purpose |
|---|---|---|
| `JWT_SECRET_KEY` | **Yes** | Signs login sessions. `docker compose` refuses to start without it. |
| `MONGO_ROOT_USERNAME` / `MONGO_ROOT_PASSWORD` | No (has dev default) | MongoDB root credentials — change these for anything beyond local use. |
| `QDRANT_API_KEY` | No (blank = no auth) | Set this to require auth on Qdrant's REST/dashboard port. The backend always uses it if set. |
| `EMBEDDING_MODEL` / `EMBEDDING_DIMENSIONS` | No | Gemini embedding model used to vectorize text for Qdrant. Change together if you switch models. |
| `GOOGLE_API_KEY` | No | Google Gemini key — powers both the AI-generated debate arguments and the embeddings used for vector search. |
| `COOKIE_SECURE` | No | Set `true` once served over HTTPS (see [Production hardening](#production-hardening)). |
| `BACKEND_PORT` / `FRONTEND_PORT` / `QDRANT_PORT` | No | Host port mapping, default `8000` / `8081` / `6333`. |
| `PUBLIC_API_URL` / `PUBLIC_SOCKET_URL` | No | Baked into the frontend build — must be reachable from the *browser*, not just the Docker network. |

## Production hardening in this pass

- **Both app containers run as non-root.** Backend has a dedicated
  `vaadvivaad` system user; frontend uses `nginxinc/nginx-unprivileged`
  (listens on 8080, no root process at all).
- **MongoDB requires authentication** (`MONGO_ROOT_USERNAME`/
  `MONGO_ROOT_PASSWORD`), wired into the backend's connection string with
  `authSource=admin`. Previously wide open with no auth.
- **Cookie security is env-driven**, not hardcoded: `COOKIE_SECURE`,
  `COOKIE_SAMESITE`, and the cookie's `max_age` follow
  `app/core/config.py` settings instead of a hardcoded `secure=False` /
  `max_age=3600`. Flip `COOKIE_SECURE=true` once this sits behind HTTPS
  (a TLS-terminating reverse proxy / load balancer — not included here).
- **nginx**: gzip, `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, `X-XSS-Protection`, `server_tokens off`, and
  `Cache-Control: public, immutable` on hashed `/assets/*` (1 year) vs.
  `no-cache` on `index.html` so SPA deploys aren't stuck behind a stale
  cached shell.
- **`JWT_SECRET_KEY` has no insecure default** — `docker compose up` refuses
  to start without one set in `.env`, instead of silently running with a
  guessable secret.
- Named containers/network/volume (`vaadvivaad-*`) instead of Compose's
  auto-generated `<dir>-<service>-1` names, healthchecks + resource limits
  on every service, `.dockerignore`s so secrets/`.git`/`node_modules` never
  land in an image layer.
- **No managed cloud database dependency.** Vector search runs on
  self-hosted Qdrant instead of DataStax AstraDB — one less external
  account/credential to provision, and it's fully inspectable locally via
  the Qdrant dashboard.

## Vector search: Qdrant, not AstraDB

Originally this ran on DataStax AstraDB (managed, cloud-only, with
server-side embedding via NVIDIA's `NV-Embed-QA`). It's been replaced with
self-hosted **Qdrant** (`vaadvivaad-qdrant`) so the whole stack can run
locally with nothing outside Docker except the Gemini API call.

- Three collections, same names/shape as before: `case_laws`,
  `ipc_sections`, `evidence_type`. The backend creates them automatically
  on first use (`app/core/qdrant_client.py`) — no manual setup step.
- Qdrant doesn't embed text server-side like Astra did, so the backend now
  computes embeddings itself via Gemini's `embed_content` endpoint
  (`app/core/embeddings.py`, `GeminiEmbeddings`), using task-specific
  `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY` embeddings for better retrieval
  quality than a single symmetric embedding.
- The three vectordb controllers
  (`app/controller/vectordbcontroller/*.py`) and the three ingest helpers
  (`app/utils/save{IPCSection,IPCEvidence,SimilarCases}.py`) were rewritten
  against `langchain-qdrant`'s `QdrantVectorStore`, translating the old
  Mongo-style Astra filters (`{"section_number": {"$eq": ...}}`) into
  Qdrant's `Filter`/`FieldCondition`/`MatchValue` objects.
- **The collections start empty either way** — AstraDB never had real data
  loaded into it here either, so this swap doesn't lose anything. Loading
  real case-law/IPC/evidence data (via the `save*` helpers above) is a
  separate data-ingestion task, not done as part of this change.

## Login / Signup design

Branded split-screen auth experience
(`vaadvivaad-frontend/src/components/auth/AuthLayout.jsx`): an animated
gradient/orb brand panel with feature highlights on the left, a
glassmorphism form card on the right, floating-label icon inputs, password
show/hide, a live password-strength meter on signup, and toast
notifications alongside animated inline error banners. Verified headless
(Chrome DevTools Protocol) in both light and dark theme, at a mobile
viewport, and through the password-strength and invalid-login interaction
paths — no console errors in any of them.

## Fixes that were needed to get this running at all

- **The backend Dockerfile ran the wrong ASGI app.** `uvicorn app.main:app`
  served the bare FastAPI app, but Socket.IO is mounted separately as
  `sio_app = socketio.ASGIApp(sio, other_asgi_app=app)` in `main.py`. Since
  the entire debate feature runs over Socket.IO, it silently 404'd on every
  deploy using that Dockerfile. Now runs `app.main:sio_app`.
- **The frontend hardcoded a stray production Socket.IO URL**
  (`https://nyayapravah.info`) inside the case page instead of using the
  configured API URL, so debates could never connect locally or in Docker.
  Now uses `VITE_SOCKET_URL` / `VITE_API_URL`.
- **A broken duplicate route** in the user API: a second
  `GET /user/debate/:id` handler referenced an undefined variable and would
  500 on every call. Removed (the working `GET /debate/{debate_id}` handler
  above it is the real one).
- **Vite's `base` was hardcoded to `/vaadvivaad/`** while `index.html`/router
  assumed root — now defaults to `/` (override with `VITE_BASE_PATH` at
  build time if you need a subpath deployment).

## Known non-blocking gaps

- Dashboard's "All Cases" / "Profile" quick-action links point at routes
  that don't exist in the router yet (they hit the 404 page). Cosmetic,
  left alone.
- `CaseSubmissionForm.jsx` is dead code (unused, navigates to a route that
  doesn't exist) — harmless, not wired into any page.
- No TLS termination is included. For real production, put this behind a
  reverse proxy / load balancer that terminates HTTPS, then set
  `COOKIE_SECURE=true`.
