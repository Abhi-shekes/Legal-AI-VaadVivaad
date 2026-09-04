"""Dense embedding, sparse encoding and cross-encoder reranking.

Three seams behind one module, all of them optional and all of them
degrading to the previous behaviour rather than failing:

* **Dense** — `gemini` (the original path) or `local`, a Text Embeddings
  Inference container serving `BAAI/bge-m3`. Going local removes the per-
  document API call that made a large ingest impractical: a 10,000-judgment
  corpus was 10,000 quota'd requests, and `llm.embed()` failing took
  retrieval down with it.

* **Sparse** — BM25 term weights from `fastembed`, computed in-process with
  no model download. Qdrant stores them as a second named vector and applies
  IDF server-side (`Modifier.IDF`), so the corpus statistics stay in the
  index rather than in a Python object that has to be kept in sync.

  This is what the dense-only path could not do. Legal text turns on exact
  tokens — `302`, `BNS 103`, a party's name — and a 1024-dimension embedding
  blurs precisely those. `normalise_section()` exists in `retrieval.py` for
  the same reason.

* **Rerank** — `BAAI/bge-reranker-v2-m3` on TEI. `retrieval.rerank()` named
  this as the intended upgrade and noted that no model weights could be
  downloaded; a local container removes that constraint. It does not replace
  the legal features (section overlap, court seniority, recency) — it is
  blended with them, because a cross-encoder does not know that an apex court
  judgment on the same provision binds harder.

Every provider here is checked with `available()` before use, and every
caller has a defined answer for "not available". That is deliberate: the
application must still run on a laptop with nothing but Qdrant and a Gemini
key, which is what it does today.
"""

from __future__ import annotations

import abc
import asyncio
import re
from typing import List, Optional, Sequence, Tuple

import httpx

from app.core.config import settings
from app.core.errors import RetrievalError
from app.core.logging import get_logger

log = get_logger(__name__)

# Named vectors on the Qdrant collections. Named rather than the default
# unnamed vector because a sparse vector has to sit beside the dense one.
DENSE = "dense"
SPARSE = "bm25"

# (indices, values) — the wire shape of a sparse vector.
SparseVector = Tuple[List[int], List[float]]


# ── dense ────────────────────────────────────────────────────────────────

class DenseEmbedder(abc.ABC):
    """Text to a fixed-width float vector."""

    name: str = "dense"

    @property
    @abc.abstractmethod
    def dimensions(self) -> int: ...

    @abc.abstractmethod
    async def embed(self, texts: Sequence[str], *, query: bool = False
                    ) -> List[List[float]]: ...


class GeminiEmbedder(DenseEmbedder):
    """The original path: Gemini's `embed_content`, task-type aware.

    Retries on rate limiting, which a bulk ingest will hit immediately: the
    free embedding tier allows 100 requests a minute and a single code of
    statute is a thousand sections. Backing off makes that ingest slow but
    possible, where before it raised and lost the whole run. The real answer
    is `LocalEmbedder`, which has no quota at all.
    """

    name = "gemini"

    @property
    def dimensions(self) -> int:
        return settings.EMBEDDING_DIMENSIONS

    async def embed(self, texts: Sequence[str], *, query: bool = False
                    ) -> List[List[float]]:
        from app.core.errors import LLMRateLimited
        from app.core.llm import llm  # deferred: llm imports config, not this

        delay = 5.0
        for attempt in range(1, settings.EMBED_MAX_ATTEMPTS + 1):
            try:
                return await llm.embed(list(texts), query=query)
            except LLMRateLimited as exc:
                if is_daily_quota(exc):
                    # Sleeping is pointless: the window is a day, not a
                    # minute, and the API's own `retryDelay` still says ~60s,
                    # which would burn every attempt for nothing. Fail now
                    # with the two things that actually resolve it.
                    log.error(
                        "embeddings.daily_quota_exhausted",
                        extra={"limit": "1000 embed requests/day (Gemini free tier)",
                               "resume": "re-run the ingest tomorrow; already-indexed "
                                         "records are skipped, so it continues rather "
                                         "than starting over",
                               "avoid": "EMBEDDING_PROVIDER=local removes the quota "
                                        "entirely (see .env.example)"},
                    )
                    raise
                if attempt == settings.EMBED_MAX_ATTEMPTS:
                    raise
                wait = min(_retry_after(exc, delay), 90.0)
                log.warning("embeddings.rate_limited",
                            extra={"attempt": attempt, "sleeping": round(wait, 1),
                                   "batch": len(texts)})
                await asyncio.sleep(wait)
                delay *= 2
        return []  # unreachable; the final attempt either returns or raises


def is_daily_quota(exc: Exception) -> bool:
    """Distinguish the per-day ceiling from the per-minute one.

    Gemini's free tier caps embedding at 100 requests a minute *and* 1000 a
    day, and reports both as a plain 429. Only the first is worth waiting
    out; treating the second the same way sleeps through every retry and
    fails anyway, several minutes later, with a misleading message.
    """
    return "perday" in str(exc).lower().replace("_", "").replace(" ", "")


def _retry_after(exc: Exception, fallback: float) -> float:
    """Prefer the delay the API itself asked for over our backoff curve."""
    match = re.search(r"retry in (\d+(?:\.\d+)?)s", str(exc), re.I)
    if match:
        return float(match.group(1)) + 1.0
    return fallback


def _describe(exc: Exception) -> str:
    """A usable message even when the exception has none.

    httpx timeouts stringify to "", so the original wording produced
    "embedding service unavailable: " and told nobody anything. The class
    name is the diagnosis here -- ReadTimeout and ConnectError have entirely
    different fixes.
    """
    detail = str(exc).strip()
    return f"{type(exc).__name__}: {detail[:160]}" if detail else type(exc).__name__


class LocalEmbedder(DenseEmbedder):
    """Hugging Face Text Embeddings Inference over HTTP.

    `bge-m3` is symmetric — it needs no query/document prefix — but the
    setting exists because several strong alternatives (`e5`, `gte`) are
    asymmetric and would silently lose recall without one.
    """

    name = "local"

    def __init__(self, base_url: str) -> None:
        self._base = base_url.rstrip("/")
        self._client: Optional[httpx.AsyncClient] = None
        self._dimensions: Optional[int] = None
        self._warm = False
        self._warm_lock = asyncio.Lock()

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self._base, timeout=settings.TEI_TIMEOUT_SECONDS
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    @property
    def dimensions(self) -> int:
        # Until the first call has confirmed it, trust configuration. A
        # mismatch is caught and logged loudly on that first call, because a
        # collection built at the wrong width is silently useless.
        return self._dimensions or settings.EMBEDDING_DIMENSIONS

    async def _ensure_warm(self) -> None:
        """Absorb the model load before the first real batch.

        TEI reports it plainly: the first request spends ~15s in `queue_time`
        with `inference_time` under a second, then settles to ~70ms. An ingest
        whose opening batch lands on that cold start times out and takes the
        whole run with it, which is exactly how the first statute rebuild
        failed. One tiny request on a generous deadline pays it once.
        """
        if self._warm:
            return
        async with self._warm_lock:
            if self._warm:
                return
            try:
                await self._http().post(
                    "/embed",
                    json={"inputs": ["warmup"], "normalize": True, "truncate": True},
                    timeout=settings.TEI_WARMUP_TIMEOUT_SECONDS,
                )
            except Exception as exc:
                log.warning("embeddings.warmup_failed",
                            extra={"error": _describe(exc)})
            self._warm = True

    async def embed(self, texts: Sequence[str], *, query: bool = False
                    ) -> List[List[float]]:
        if not texts:
            return []
        await self._ensure_warm()
        prefix = settings.TEI_QUERY_PREFIX if query else settings.TEI_DOCUMENT_PREFIX
        inputs = [f"{prefix}{t}" for t in texts] if prefix else list(texts)
        try:
            response = await self._http().post(
                "/embed", json={"inputs": inputs, "normalize": True, "truncate": True}
            )
            response.raise_for_status()
            vectors = response.json()
        except Exception as exc:
            raise RetrievalError(
                f"embedding service unavailable: {_describe(exc)}") from exc

        if vectors and self._dimensions is None:
            self._dimensions = len(vectors[0])
            if self._dimensions != settings.EMBEDDING_DIMENSIONS:
                log.error(
                    "embeddings.dimension_mismatch",
                    extra={"configured": settings.EMBEDDING_DIMENSIONS,
                           "actual": self._dimensions,
                           "fix": "set EMBEDDING_DIMENSIONS to the actual value "
                                  "and re-ingest with --recreate"},
                )
        return vectors


_embedder: Optional[DenseEmbedder] = None


def get_embedder() -> DenseEmbedder:
    global _embedder
    if _embedder is None:
        if settings.EMBEDDING_PROVIDER == "local":
            _embedder = LocalEmbedder(settings.TEI_EMBED_URL)
        else:
            _embedder = GeminiEmbedder()
        log.info("embeddings.provider",
                 extra={"provider": _embedder.name,
                        "dimensions": _embedder.dimensions})
    return _embedder


def set_embedder(embedder: Optional[DenseEmbedder]) -> None:
    """Test seam. Passing None restores selection from settings."""
    global _embedder
    _embedder = embedder


# ── sparse ───────────────────────────────────────────────────────────────

class SparseEncoder:
    """BM25 term weights via fastembed.

    fastembed is an optional dependency, the same way `redis` is in
    `core.store`: absent, hybrid search is skipped and retrieval runs the
    dense path it ran before. `Bm25` carries no neural weights — it is a
    tokeniser, a stemmer and a stopword list — so this stays in-process
    rather than becoming another container.
    """

    def __init__(self, model_name: str) -> None:
        self._model_name = model_name
        self._model = None
        self._unavailable = False
        self._lock = asyncio.Lock()

    async def _ensure(self):
        if self._model is not None or self._unavailable:
            return self._model
        async with self._lock:
            if self._model is not None or self._unavailable:
                return self._model
            try:
                from fastembed import SparseTextEmbedding

                self._model = await asyncio.to_thread(
                    SparseTextEmbedding, model_name=self._model_name
                )
                log.info("embeddings.sparse_ready", extra={"model": self._model_name})
            except Exception as exc:
                self._unavailable = True
                log.warning("embeddings.sparse_unavailable",
                            extra={"model": self._model_name,
                                   "error": str(exc)[:160],
                                   "effect": "hybrid search disabled, dense only"})
        return self._model

    async def available(self) -> bool:
        return await self._ensure() is not None

    async def encode(self, texts: Sequence[str], *, query: bool = False
                     ) -> List[SparseVector]:
        """Returns [] when unavailable, so callers branch on emptiness."""
        model = await self._ensure()
        if model is None or not texts:
            return []

        def _run() -> List[SparseVector]:
            # `query_embed` drops document-frequency weighting, which is what
            # you want on the query side; the IDF half is applied by Qdrant.
            batch = (model.query_embed(list(texts)) if query
                     else model.embed(list(texts)))
            return [(e.indices.tolist(), e.values.tolist()) for e in batch]

        try:
            return await asyncio.to_thread(_run)
        except Exception as exc:
            log.warning("embeddings.sparse_failed", extra={"error": str(exc)[:160]})
            return []


_sparse: Optional[SparseEncoder] = None


def get_sparse_encoder() -> SparseEncoder:
    global _sparse
    if _sparse is None:
        _sparse = SparseEncoder(settings.SPARSE_MODEL)
    return _sparse


def set_sparse_encoder(encoder: Optional[SparseEncoder]) -> None:
    """Test seam."""
    global _sparse
    _sparse = encoder


# ── rerank ───────────────────────────────────────────────────────────────

class Reranker:
    """Cross-encoder relevance over (query, document) pairs.

    A bi-encoder scores the query and the document apart and compares the
    results; a cross-encoder reads them together, which is why it separates
    two judgments under the same section far better than cosine does. It is
    also far too slow to run over a corpus, which is exactly why it belongs
    here — over 8 candidates — and not in the index.
    """

    def __init__(self, base_url: str) -> None:
        self._base = (base_url or "").rstrip("/")
        self._client: Optional[httpx.AsyncClient] = None

    def configured(self) -> bool:
        return bool(self._base)

    def _http(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self._base, timeout=settings.TEI_TIMEOUT_SECONDS
            )
        return self._client

    async def aclose(self) -> None:
        if self._client is not None:
            await self._client.aclose()
            self._client = None

    async def score(self, query: str, documents: Sequence[str]) -> List[float]:
        """Relevance in 0..1, aligned to `documents`. [] when unavailable.

        Returning [] rather than raising is the contract the caller relies on
        to fall back to the deterministic feature ranking.
        """
        if not self.configured() or not documents:
            return []
        try:
            response = await self._http().post(
                "/rerank",
                json={"query": query, "texts": list(documents),
                      "raw_scores": False, "truncate": True},
            )
            response.raise_for_status()
            ranked = response.json()
        except Exception as exc:
            log.warning("embeddings.rerank_failed",
                        extra={"error": str(exc)[:160],
                               "effect": "falling back to feature ranking"})
            return []

        scores = [0.0] * len(documents)
        for item in ranked:
            index = item.get("index")
            if isinstance(index, int) and 0 <= index < len(scores):
                scores[index] = float(item.get("score", 0.0))
        return scores


_reranker: Optional[Reranker] = None


def get_reranker() -> Reranker:
    global _reranker
    if _reranker is None:
        _reranker = Reranker(settings.TEI_RERANK_URL)
    return _reranker


def set_reranker(reranker: Optional[Reranker]) -> None:
    """Test seam."""
    global _reranker
    _reranker = reranker


async def close_providers() -> None:
    """Release HTTP clients at shutdown."""
    if isinstance(_embedder, LocalEmbedder):
        await _embedder.aclose()
    if _reranker is not None:
        await _reranker.aclose()
