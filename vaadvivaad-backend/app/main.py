from fastapi import FastAPI
from app.api.routes import auth
from app.api.routes import vectordb
from app.api.routes import gemini
from app.core.config import settings

app = FastAPI(title="FastAPI Mongo Auth")


app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(vectordb.router , prefix="/api/vectordb" , tags = ["VectorDB"])
app.include_router(gemini.router , prefix = "/api/gemini" , tags = ["Gemini Generation"])
