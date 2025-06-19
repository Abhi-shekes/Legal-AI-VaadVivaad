# app/main.py (FINAL CORRECTED VERSION)

# --- Standard Library and 3rd-Party Imports ---
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import socketio

# --- Local Application Imports ---

# 1. Import the shared instances from our new central file.
# This solves the circular import problem.
from app.socket_instance import sio, origins

# 2. Import all your route modules.
from app.api.routes import auth, vectordb, user, gemini


# 3. Create the main FastAPI app instance.
# We will configure this object fully before anything else.
app = FastAPI(title="FastAPI Mongo Auth")


# 4. Add all middleware to the app instance.
# This MUST be done before creating the final combined app. This step is
# crucial for allowing CORS preflight requests (like your login) to work.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# 5. Include all your HTTP routers.
# This attaches all your API endpoints (e.g., /api/auth/login) to the app.
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(vectordb.router, prefix="/api/vectordb", tags=["VectorDB"])
app.include_router(gemini.router, prefix="/api/gemini", tags=["Gemini Generation"])
app.include_router(user.router, prefix="/api/user", tags=["User API"])


# 6. Create the final combined ASGI app LAST.
# This step takes the fully configured 'app' (with middleware and routes)
# and wraps it with the Socket.IO server. This is the object that Uvicorn
# will run.
sio_app = socketio.ASGIApp(sio, other_asgi_app=app)