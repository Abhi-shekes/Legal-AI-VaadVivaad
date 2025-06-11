from fastapi import FastAPI
from app.api.routes import auth
from app.api.routes import vectordb
from app.api.routes import user
from app.api.routes import gemini
from app.core.config import settings
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="FastAPI Mongo Auth")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(vectordb.router , prefix="/api/vectordb" , tags = ["VectorDB"])
app.include_router(gemini.router , prefix = "/api/gemini" , tags = ["Gemini Generation"])
app.include_router(user.router ,  prefix = "/api/user" , tags = ["User API"])
