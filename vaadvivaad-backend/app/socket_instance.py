import os
import socketio


_extra_origins = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()
]

origins = [
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3000",  # Another common port for React
    "http://localhost:8081",  # Dockerized frontend (nginx)
    "https://vaad-vivaad-app.onrender.com",
    "https://nyayapravah.info",
    *_extra_origins,
]

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=origins  # <-- USE THE LIST, NOT '*'
)