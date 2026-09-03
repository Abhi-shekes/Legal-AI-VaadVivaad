"""Shared Socket.IO server instance (kept separate to avoid a circular import).

Origins come from configuration only. The previous version hardcoded two
production hostnames into the source, which meant the allow-list could not be
changed without a redeploy and shipped other people's domains to every fork.
"""

import socketio

from app.core.config import settings

_DEV_ORIGINS = [
    "http://localhost:5173",   # Vite dev server
    "http://localhost:3000",
    "http://localhost:8081",   # dockerised frontend behind nginx
]

origins = settings.cors_origins or (_DEV_ORIGINS if not settings.is_production else [])

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=origins,
    # Kept modest: a hearing emits many small events and a slow client should
    # be disconnected rather than buffered indefinitely.
    ping_timeout=30,
    ping_interval=25,
)
