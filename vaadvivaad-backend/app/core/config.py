from typing import List, Literal, Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── MongoDB ──────────────────────────────────────────────────────────
    MONGO_URL: str
    DB_NAME: str

    # ── JWT / session ────────────────────────────────────────────────────
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    # Short-lived access token; the refresh token is what keeps a user signed
    # in. Previously this was 30 minutes with no refresh at all, so a debate
    # that outlived it failed to save with a silent 401.
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14

    # ── Qdrant ───────────────────────────────────────────────────────────
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""

    # ── Redis ────────────────────────────────────────────────────────────
    # Optional. When set (and the `redis` package is installed) it backs the
    # session store, rate limiter, LLM cache and the Socket.IO manager, which
    # is what makes running more than one backend replica correct. Without it
    # the app falls back to per-process in-memory implementations, which are
    # fine for a single instance and for tests.
    REDIS_URL: str = ""

    # ── Google Gemini ────────────────────────────────────────────────────
    GOOGLE_API_KEY: str

    # Model routing. Cheap, high-volume classification and extraction run on
    # the fast tier; the Bench's reasoning and closing arguments get the
    # stronger one. Both are "-latest" aliases on purpose: pinned model names
    # get sunset by Google and start 404ing with no warning.
    GEMINI_MODEL_FAST: str = "gemini-flash-lite-latest"
    GEMINI_MODEL_REASONING: str = "gemini-flash-latest"

    # Back-compat: the old single-model setting. If someone has GEMINI_MODEL
    # in their .env, honour it as the fast tier rather than silently ignoring.
    GEMINI_MODEL: str = ""

    EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIMENSIONS: int = 768

    # ── LLM behaviour ────────────────────────────────────────────────────
    LLM_TIMEOUT_SECONDS: float = 45.0
    LLM_MAX_ATTEMPTS: int = 3
    LLM_CACHE_TTL_SECONDS: int = 60 * 60 * 24 * 30  # section/evidence lookups
    # Hard ceiling per debate. The orchestrator aborts rather than run away
    # with someone's quota; there was previously no accounting at all.
    DEBATE_TOKEN_BUDGET: int = 120_000
    DEBATE_MAX_ROUNDS: int = 4

    # ── Retrieval ────────────────────────────────────────────────────────
    RETRIEVAL_CANDIDATES: int = 8      # k before rerank
    RETRIEVAL_TOP_N: int = 3           # kept after rerank
    RETRIEVAL_MIN_SCORE: float = 0.55  # cosine floor on candidates

    # ── Rate limits (requests per window, seconds) ────────────────────────
    RATELIMIT_AUTH: str = "10/300"      # login/signup attempts per IP
    RATELIMIT_DEBATE: str = "5/3600"    # debates started per user
    RATELIMIT_API: str = "120/60"       # general authenticated API per user

    # ── Cookies / CORS ───────────────────────────────────────────────────
    COOKIE_SECURE: bool = False
    COOKIE_SAMESITE: str = "lax"
    CORS_ORIGINS: str = "http://localhost:8081,http://localhost:5173"

    ENVIRONMENT: Literal["development", "production", "test"] = "development"
    LOG_LEVEL: str = "INFO"
    # Emit human-readable logs instead of JSON. Defaults on in development.
    LOG_CONSOLE: Optional[bool] = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @field_validator("JWT_SECRET_KEY")
    @classmethod
    def _reject_weak_secret(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError(
                "JWT_SECRET_KEY must be at least 32 characters "
                "(generate one with `openssl rand -hex 32`)"
            )
        return v

    @property
    def cors_origins(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def fast_model(self) -> str:
        return self.GEMINI_MODEL or self.GEMINI_MODEL_FAST

    @property
    def reasoning_model(self) -> str:
        return self.GEMINI_MODEL_REASONING

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def log_console(self) -> bool:
        if self.LOG_CONSOLE is not None:
            return self.LOG_CONSOLE
        return not self.is_production


settings = Settings()
