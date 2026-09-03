"""Application assembly.

Uvicorn runs `app.main:sio_app` — the Socket.IO ASGI wrapper around the
FastAPI app, not the bare `app`, or the hearing endpoints are never mounted.
"""

from __future__ import annotations

from contextlib import asynccontextmanager

import socketio
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import auth, cases
from app.core.config import settings
from app.core.errors import RateLimited, VaadVivaadError
from app.core.logging import bind, configure, get_logger, new_request_id
from app.core.logging import context as log_context
from app.core.qdrant_client import close_client, ensure_all
from app.core.store import close_store, get_store
from app.db.repository import ensure_indexes
from app.socket_instance import origins, sio

configure(settings.LOG_LEVEL, console=settings.log_console)
log = get_logger(__name__)

# Importing the module registers the Socket.IO handlers on `sio`.
from app.sockets import debate as _debate_sockets  # noqa: E402,F401


@asynccontextmanager
async def lifespan(_: FastAPI):
    log.info("app.starting", extra={"env": settings.ENVIRONMENT,
                                    "fast_model": settings.fast_model,
                                    "reasoning_model": settings.reasoning_model})
    await ensure_indexes()
    try:
        await ensure_all()
    except Exception as exc:
        # Qdrant being down degrades retrieval; it must not stop the app.
        log.error("app.qdrant_unavailable", extra={"error": str(exc)[:200]})
    get_store()  # surfaces the in-memory-in-production warning at boot
    yield
    await close_client()
    await close_store()
    log.info("app.stopped")


app = FastAPI(
    title="VaadVivaad API",
    description="Adversarial legal analysis over Indian criminal law: case "
                "intake, verified precedent retrieval, a streamed hearing "
                "between counsel, and a reasoned order from the bench.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


@app.middleware("http")
async def request_context(request: Request, call_next):
    """Give every request an id and log its outcome once."""
    request_id = request.headers.get("x-request-id") or new_request_id()
    with log_context(request_id=request_id):
        try:
            response = await call_next(request)
        except Exception:
            log.exception("http.unhandled",
                          extra={"path": request.url.path, "method": request.method})
            raise
        if request.url.path not in ("/health", "/metrics"):
            log.info("http.request",
                     extra={"method": request.method, "path": request.url.path,
                            "status": response.status_code})
        response.headers["X-Request-ID"] = request_id
        return response


@app.exception_handler(VaadVivaadError)
async def handle_app_error(request: Request, exc: VaadVivaadError):
    """One shape for every application error, with a code the UI can branch on."""
    headers = {}
    if isinstance(exc, RateLimited):
        headers["Retry-After"] = str(exc.retry_after)
    if exc.http_status >= 500:
        log.error("app.error", extra={"code": exc.code, "detail": exc.detail[:300]})
    return JSONResponse(status_code=exc.http_status,
                        content={"status": "error", **exc.to_payload()},
                        headers=headers)


@app.exception_handler(RequestValidationError)
async def handle_validation(request: Request, exc: RequestValidationError):
    fields = sorted({".".join(str(p) for p in e.get("loc", [])[1:])
                     for e in exc.errors()} - {""})
    return JSONResponse(
        status_code=422,
        content={"status": "error", "code": "validation_failed",
                 "message": "Some details were not usable: " + ", ".join(fields)
                            if fields else "The request could not be read.",
                 "fields": fields},
    )


@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok", "version": app.version}


@app.get("/ready", include_in_schema=False)
async def ready():
    """Dependency-aware readiness, as opposed to "the process is alive"."""
    from app.core.qdrant_client import CASE_LAWS, count
    from app.db.mongodb import db

    checks = {}
    try:
        await db.command("ping")
        checks["mongo"] = "ok"
    except Exception as exc:
        checks["mongo"] = f"error: {str(exc)[:80]}"
    try:
        checks["qdrant"] = "ok"
        checks["corpus_size"] = await count(CASE_LAWS)
    except Exception as exc:
        checks["qdrant"] = f"error: {str(exc)[:80]}"
    healthy = all(v == "ok" for k, v in checks.items() if k in ("mongo", "qdrant"))
    return JSONResponse(status_code=200 if healthy else 503,
                        content={"status": "ok" if healthy else "degraded", **checks})


app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(cases.router, prefix="/user", tags=["Cases"])

# The Socket.IO wrapper is created last so it sees a fully configured app.
sio_app = socketio.ASGIApp(sio, other_asgi_app=app)
