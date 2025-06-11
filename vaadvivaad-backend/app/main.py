# main.py (Corrected)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

# 1. Define the SIO server instance centrally.
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')

from app.api.routes import auth, vectordb, user, gemini

# 2. Create the main FastAPI app and the combined ASGI app.
app = FastAPI(title="FastAPI Mongo Auth")
sio_app = socketio.ASGIApp(sio, other_asgi_app=app) # The combined app to run

# +++ THE FIX IS HERE +++
# Define the list of allowed origins.
# Don't use a wildcard "*" when allow_credentials=True.
origins = [
    "http://localhost:5173",  # Your Vite/React frontend
    "http://localhost:3000",  # Another common port for React

]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,      # Use the specific list of origins
    allow_credentials=True,     # This can now be True
    allow_methods=["*"],        # Allow all methods
    allow_headers=["*"],        # Allow all headers
)


# 4. Include all your HTTP routers as normal.
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(vectordb.router, prefix="/api/vectordb", tags=["VectorDB"])
app.include_router(gemini.router, prefix="/api/gemini", tags=["Gemini Generation"])
app.include_router(user.router, prefix="/api/user", tags=["User API"])