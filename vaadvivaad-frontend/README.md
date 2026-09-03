# VaadVivaad Frontend

React + Vite single-page app for VaadVivaad: auth, dashboard, case
submission, and the live AI-debate view (Socket.IO client).

> Running the full stack (this + the backend + MongoDB) via Docker is
> documented in the [root README](../README.md) — start there unless you
> specifically need to run just this app on the host.

## Stack

React 18, React Router 7, Vite 6, Tailwind CSS, Zustand (auth/theme state),
Framer Motion, `socket.io-client`, `react-toastify`.

## Run standalone (without Docker)

Requires the backend already running somewhere reachable (defaults to
`http://localhost:8000`).

```bash
npm install
cp .env.local.example .env.local   # if present, else see vars below
npm run dev
```

Env vars (`.env.local`, Vite-only — must start with `VITE_`, and are baked
in at build time, not read at runtime):

| Var                | Purpose                                              | Default              |
|---------------------|-------------------------------------------------------|-----------------------|
| `VITE_API_URL`      | Backend REST base URL                                  | `http://localhost:8000` |
| `VITE_SOCKET_URL`   | Backend Socket.IO URL (falls back to `VITE_API_URL`)   | `http://localhost:8000` |
| `VITE_BASE_PATH`    | Build-time base path, for subpath deployments          | `/`                    |

## Structure

```
src/
  Pages/            Route-level screens (Landing, Login, Signup, Dashboard, Case, ...)
  components/        Shared UI (Header, Footer, ProtectedRoute, ...)
  components/auth/   AuthLayout, FormField, PasswordStrengthMeter (Login/Signup)
  components/case/   Debate chat UI (CaseForm, DebateChat, MessageCard, ...)
  layouts/            PublicLayout (Header + Footer wrapper)
  store/              Zustand stores: authStore (persisted), themeStore
```

## Build

```bash
npm run build     # outputs to dist/
npm run preview   # serve the production build locally
```
