# VaadVivaad Frontend

React + Vite single-page app for VaadVivaad: auth, the dashboard ("The
Docket"), case filing (typed, dictated, or from a document), the live
Socket.IO hearing, and the full case record — transcript, order, evidence
audit, timeline, case file, consult and export.

> Running the full stack via Docker is documented in the
> [root README](../README.md) — start there unless you specifically need to
> run just this app on the host.

## Stack

React 18, React Router 7, Vite 6, Tailwind CSS (semantic design tokens that
flip on `html.dark`), Zustand (auth + theme), Framer Motion,
`socket.io-client`, `react-markdown`, `react-toastify`.

## Run standalone (without Docker)

Requires the backend reachable (defaults to `http://localhost:8000`).

```bash
npm install
cp .env.local.example .env.local   # if present, else see the table below
npm run dev
```

Env vars (`.env.local`, Vite-only — must start with `VITE_`, baked in at
build time):

| Var | Purpose | Default |
|---|---|---|
| `VITE_API_URL` | Backend REST base URL | `http://localhost:8000` |
| `VITE_SOCKET_URL` | Backend Socket.IO URL (falls back to `VITE_API_URL`) | `http://localhost:8000` |
| `VITE_BASE_PATH` | Build-time base path for subpath deployments | `/` |

## Design system — "The Docket"

`src/index.css` declares semantic colour tokens as RGB channels
(`--surface`, `--content`, `--brass`, `--verdict`, `--dissent`, …) so
Tailwind opacity modifiers work against them (`text-content/60`,
`border-line/12`) and a single class resolves correctly in both themes. Type
is Fraunces (display) + IBM Plex Sans / Mono. The marketing and auth pages
are deliberately single-theme and still use the fixed brand values
(`ink`, `parchment`, `ink-blue`, `brass`).

## Structure

```
src/
  Pages/
    Landing, Login, Signup            Public marketing + auth
    Dashboard                          The Docket — ledger, metrics, ⌘K
    Case                               File a case, then watch it argued live
    CaseDetails                        The full record of a concluded matter
    Contact, Terms, Privacy, Page404
  layouts/
    PublicLayout                       Header + public routes
    AppShell                           Signed-in chrome + CommandPalette (⌘K)
  components/
    auth/        AuthLayout, FormField, PasswordStrengthMeter
    intake/      Composer, DictateButton, DocumentDrop, EvidenceChips,
                 ExtractionReview, ReadinessMeter
    hearing/     StageRail, Transcript, TurnBlock, ElementsChecklist,
                 VerdictBanner, TakeASide, ConsultPanel, PriorRulings
    case/        CaseFilePanel, TimelinePanel, OutsideRecordPanel,
                 EvidenceGapsCard, StrengthCard, RulingCard
    docket/      CaseCard, CaseTable, CommandBar, EmptyDocket, MetricTile
    CommandPalette, StatutePopover, Header, ProtectedRoute, PublicRoute
  hooks/
    useSession     One server-side session check per load; routes wait on it
    useDebateSocket  The live hearing — join, start/resume, stream turns
    useLogout
  lib/
    api.js         Fetch client: 401 → single shared refresh + one replay,
                   raw-body uploads, brief download. One place for every call.
    caseDoc.js     Hydrate the UI from a stored debate document
    hearing.js, docket.js, filings.js, search.js, motion.js, lazyChunk.jsx
  store/
    authStore (persisted), themeStore
```

## Routes

| Path | Screen | Guard |
|---|---|---|
| `/` | Landing | public |
| `/login`, `/signup` | Auth | redirect if signed in |
| `/contact`, `/terms`, `/privacy` | Static | public |
| `/user/dashboard` | The Docket | protected |
| `/user/case` | File a new case | protected |
| `/user/case/:id` | Resume a hearing (server replays finished, continues unfinished) | protected |
| `/case/:id` | The full record of a concluded matter | protected |

## Build

```bash
npm run build     # → dist/
npm run preview   # serve the production build
npm run lint
```
