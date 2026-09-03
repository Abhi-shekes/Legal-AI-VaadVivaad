from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # MongoDB Configuration
    MONGO_URL: str 
    DB_NAME: str 
    
    # JWT Configuration
    JWT_SECRET_KEY: str 
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Qdrant Configuration (self-hosted vector search: case laws, IPC
    # sections, evidence types)
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""

    # Google API Configuration
    GOOGLE_API_KEY: str

    # Text-generation model for debate arguments/prompt refinement. Using
    # the "-latest" alias rather than a pinned version (e.g. "gemini-2.5-flash")
    # on purpose: pinned model names get sunset by Google and start 404ing
    # with no warning (that's exactly what happened here -- see git history).
    GEMINI_MODEL: str = "gemini-flash-latest"

    # Embedding model used to vectorize text before storing/searching in
    # Qdrant. Gemini's embedding endpoint, not a separate service, since
    # GOOGLE_API_KEY is already a hard requirement for the rest of the app.
    # "text-embedding-004" was retired; gemini-embedding-001 replaces it and
    # supports truncating its native 3072-dim output down to
    # EMBEDDING_DIMENSIONS via output_dimensionality (see embeddings.py).
    EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIMENSIONS: int = 768

    # Cookie / session security -- flip COOKIE_SECURE to true once served over HTTPS
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"

    # Runtime environment: "development" | "production"
    ENVIRONMENT: str = "development"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore"
    )


settings = Settings()
