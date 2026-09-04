from typing import List, Literal, Optional

from pydantic import field_validator, model_validator
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

    # Model routing. Both tiers default to flash-lite: it is the only tier
    # whose free quota can carry a whole hearing (the larger models allow a
    # handful of requests per minute and 429 partway through), and this
    # project runs entirely on free and self-hosted parts with Gemini as the
    # single external service.
    #
    # The two settings are kept separate rather than collapsed into one so a
    # deployment with paid quota can point the reasoning tier at a stronger
    # model without touching code. When they are equal the tier-fallback path
    # is simply a no-op.
    GEMINI_MODEL_FAST: str = "gemini-flash-lite-latest"
    GEMINI_MODEL_REASONING: str = "gemini-flash-lite-latest"

    # Back-compat: the old single-model setting. If someone has GEMINI_MODEL
    # in their .env, honour it as the fast tier rather than silently ignoring.
    GEMINI_MODEL: str = ""

    EMBEDDING_MODEL: str = "gemini-embedding-001"
    EMBEDDING_DIMENSIONS: int = 768

    # ── Retrieval models ─────────────────────────────────────────────────
    # Dense embeddings come from Gemini by default, which keeps a fresh
    # install to one external service. Pointing this at a local Text
    # Embeddings Inference container removes the per-document API call that
    # makes a large ingest impractical, and lets retrieval keep working when
    # the Gemini quota is exhausted.
    #
    # Switching provider almost always changes the vector width
    # (gemini-embedding-001 at 768 -> bge-m3 at 1024). Set EMBEDDING_DIMENSIONS
    # to match and re-ingest with `--recreate`; a collection built at the wrong
    # width is silently useless rather than loudly broken.
    EMBEDDING_PROVIDER: Literal["gemini", "local"] = "gemini"
    TEI_EMBED_URL: str = ""
    TEI_RERANK_URL: str = ""
    # Steady-state embedding is ~70ms; this only has to cover a slow batch.
    TEI_TIMEOUT_SECONDS: float = 120.0
    # The first request after a container start waits on the model load --
    # TEI reports ~15s of queue_time. Paid once, by an explicit warmup.
    TEI_WARMUP_TIMEOUT_SECONDS: float = 180.0
    # bge-m3 is symmetric and needs neither. e5/gte-family models need
    # "query: " and "passage: " respectively, and lose recall without them.
    # Embedding retries. Bulk ingest through Gemini hits the free tier's
    # 100-requests-per-minute cap almost immediately; backing off makes a
    # large ingest slow rather than impossible.
    EMBED_MAX_ATTEMPTS: int = 5
    TEI_QUERY_PREFIX: str = ""
    TEI_DOCUMENT_PREFIX: str = ""

    # Hybrid (sparse + dense) retrieval. Requires `fastembed`; when it is not
    # importable this silently stays off and retrieval runs dense-only.
    HYBRID_SEARCH: bool = True
    SPARSE_MODEL: str = "Qdrant/bm25"

    # Cross-encoder rerank. Only used when TEI_RERANK_URL is set.
    # RERANK_WEIGHT splits the final ordering between the cross-encoder and
    # the legal features (section overlap, court seniority, recency) — the
    # features are not discarded, because a cross-encoder does not know that
    # apex authority on the same provision binds harder.
    RERANK_WEIGHT: float = 0.60
    RERANK_MIN_RELEVANCE: float = 0.30

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

    # ── Search over a user's own record ──────────────────────────────────
    # Optional. Empty falls back to a MongoDB text index, which searches the
    # case description and offence but not the transcript. Meilisearch
    # searches everything and tolerates typos; start it with
    # `docker compose --profile search up -d`.
    MEILI_URL: str = ""
    MEILI_MASTER_KEY: str = ""

    # ── Live grounding (F-09) ────────────────────────────────────────────
    # Optional. Empty disables it and the "outside the record" panel simply
    # reports unavailable. Results from here are never citable by counsel and
    # never enter the debate context -- see services/websearch.py.
    SEARXNG_URL: str = ""
    WEBSEARCH_TIMEOUT_SECONDS: float = 12.0
    # Comma-separated. Empty uses websearch.DEFAULT_ALLOWLIST, which is the
    # free official publishers plus Indian Kanoon.
    WEBSEARCH_ALLOWLIST: str = ""

    # ── Voice (F-10) ─────────────────────────────────────────────────────
    # Both optional and independent. Empty means the textarea works exactly as
    # it does today; neither half implies the other.
    #   WHISPER_URL  faster-whisper, OpenAI-compatible transcription
    #   PIPER_URL    Piper TTS, one voice per persona
    WHISPER_URL: str = ""
    WHISPER_MODEL: str = "Systran/faster-whisper-small"
    PIPER_URL: str = ""
    VOICE_TIMEOUT_SECONDS: float = 120.0
    # The first request after a container start loads the model.
    VOICE_WARMUP_TIMEOUT_SECONDS: float = 300.0
    # A turn is a few sentences; this is a guard against synthesising a whole
    # transcript in one request.
    TTS_MAX_CHARS: int = 4000

    # ── Corpus harvesting ────────────────────────────────────────────────
    # Used only by `python -m app.services.ingest.pipeline --harvest ...`,
    # never by the request path. The defaults are deliberately slow: these
    # are free, publicly funded portals on modest infrastructure, and being a
    # good guest is what keeps the project able to use them at all.
    HARVEST_CACHE_DIR: str = ".harvest-cache"
    HARVEST_MIN_INTERVAL_SECONDS: float = 1.0
    HARVEST_TIMEOUT_SECONDS: float = 40.0
    HARVEST_MAX_RETRIES: int = 3
    HARVEST_USER_AGENT: str = "VaadVivaad/2.0 (legal corpus ingest; contact via repo)"
    INDIACODE_BASE_URL: str = "https://indiacode.gov.in"

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

    @model_validator(mode="after")
    def _local_provider_needs_a_url(self) -> "Settings":
        if self.EMBEDDING_PROVIDER == "local" and not self.TEI_EMBED_URL.strip():
            raise ValueError(
                "EMBEDDING_PROVIDER=local requires TEI_EMBED_URL "
                "(e.g. http://tei-embed:80)"
            )
        return self

    @property
    def rerank_enabled(self) -> bool:
        return bool(self.TEI_RERANK_URL.strip())

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
