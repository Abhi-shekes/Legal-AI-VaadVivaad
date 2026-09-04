"""Async Gemini client with structured output, retries, caching and accounting.

Replaces `model_config.py`, which was synchronous (so every call blocked the
event loop and the whole server served one debate at a time), asked for JSON
in prose then stripped markdown fences by hand, retried with `time.sleep`, and
returned `None` on any failure — surfacing several frames later as a
`TypeError`.

What changed:
  * `client.aio` throughout — nothing blocks the loop.
  * `response_schema`, so the model is constrained to conforming JSON.
  * Exponential backoff with jitter, and 429s are distinguished from faults.
  * Every call is charged to a `TokenLedger`, so a debate has a hard ceiling.
  * Deterministic lookups (statute text, evidence profiles) are cached.
  * Two tiers: cheap extraction vs. the Bench's reasoning.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import random
import time
from dataclasses import dataclass, field
from typing import Any, AsyncIterator, Callable, Dict, Optional, Type, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from app.core.config import settings
from app.core.errors import (
    BudgetExceeded,
    LLMError,
    LLMInvalidOutput,
    LLMRateLimited,
    LLMTimeout,
)
from app.core import metrics
from app.core.logging import Timer, get_logger
from app.core.store import get_store

log = get_logger(__name__)

T = TypeVar("T", bound=BaseModel)

FAST = "fast"
REASONING = "reasoning"

# Minimum accepted `thinking_budget` per model, learned on first rejection.
# Some tiers refuse a zero budget but accept a small one.
_THINKING_FLOOR: Dict[str, int] = {}
_THINKING_FALLBACK = 128

# Circuit breaker per model. A model that has just exhausted its quota will
# do so again on the next call, so retrying it costs latency for nothing.
# When the breaker is open the client drops to the cheaper tier immediately
# and says so -- a documented degraded mode rather than a failed debate.
# This matters in practice: the free tier allows only a handful of requests
# per minute on the larger models, which is not enough to finish a hearing.
_CIRCUIT_OPEN_UNTIL: Dict[str, float] = {}
_CIRCUIT_COOLDOWN_SECONDS = 90.0


def _circuit_is_open(model: str) -> bool:
    until = _CIRCUIT_OPEN_UNTIL.get(model, 0.0)
    if until and until > time.monotonic():
        return True
    _CIRCUIT_OPEN_UNTIL.pop(model, None)
    return False


def _trip_circuit(model: str) -> None:
    _CIRCUIT_OPEN_UNTIL[model] = time.monotonic() + _CIRCUIT_COOLDOWN_SECONDS
    metrics.inc("vaadvivaad_llm_circuit_trips_total", model=model)
    log.warning("llm.circuit_open", extra={"model": model,
                                           "cooldown_s": _CIRCUIT_COOLDOWN_SECONDS})


# ── Token accounting ─────────────────────────────────────────────────────

@dataclass
class TokenLedger:
    """Per-debate spend, so a runaway loop cannot drain the quota.

    Nothing counted tokens before; cost per case was unmeasurable and
    therefore unmanageable.
    """

    budget: int = field(default_factory=lambda: settings.DEBATE_TOKEN_BUDGET)
    prompt_tokens: int = 0
    output_tokens: int = 0
    cached_tokens: int = 0
    calls: int = 0
    by_step: Dict[str, int] = field(default_factory=dict)

    @property
    def total(self) -> int:
        return self.prompt_tokens + self.output_tokens

    @property
    def remaining(self) -> int:
        return max(0, self.budget - self.total)

    def charge(self, step: str, prompt: int, output: int, cached: int = 0) -> None:
        self.prompt_tokens += prompt
        self.output_tokens += output
        self.cached_tokens += cached
        self.calls += 1
        self.by_step[step] = self.by_step.get(step, 0) + prompt + output

    def ensure_headroom(self, step: str, need: int = 2000) -> None:
        if self.remaining < need:
            raise BudgetExceeded(
                f"debate budget exhausted at step {step} "
                f"({self.total}/{self.budget} tokens)"
            )

    def summary(self) -> Dict[str, Any]:
        return {
            "total_tokens": self.total,
            "prompt_tokens": self.prompt_tokens,
            "output_tokens": self.output_tokens,
            "cached_tokens": self.cached_tokens,
            "calls": self.calls,
            "by_step": dict(sorted(self.by_step.items(), key=lambda kv: -kv[1])),
        }


@dataclass
class LLMResult:
    value: Any
    text: str
    model: str
    tokens: int
    from_cache: bool = False
    latency_ms: float = 0.0
    attempts: int = 1


# ── Error classification ─────────────────────────────────────────────────

def _is_invalid_argument(exc: Exception) -> bool:
    status = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    return status == 400 or "INVALID_ARGUMENT" in str(exc)


def _classify(exc: Exception) -> LLMError:
    """Map an SDK exception onto our typed errors.

    The SDK raises a handful of shapes depending on transport, so this reads
    the status code where present and the message otherwise.
    """
    status = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    message = str(exc)
    lowered = message.lower()

    if status == 429 or "429" in message or "resource_exhausted" in lowered \
            or "quota" in lowered or "rate limit" in lowered:
        return LLMRateLimited(message)
    if isinstance(exc, asyncio.TimeoutError) or "deadline" in lowered or "timeout" in lowered:
        return LLMTimeout(message)
    if status in (500, 502, 503, 504) or "unavailable" in lowered or "internal" in lowered:
        return LLMError(message)
    if status in (400, 404) or "not found" in lowered or "invalid" in lowered:
        # Not retryable: a bad model name or malformed request will fail
        # identically every time.
        err = LLMError(message)
        err.retryable = False
        return err
    return LLMError(message)


# ── Partial JSON reading, for streamed structured output ─────────────────

class PartialJSONFieldReader:
    """Extracts a growing string field out of streaming JSON.

    Structured output and token streaming are usually treated as mutually
    exclusive: you either get a schema-conforming object at the end, or you
    stream prose. The debate wants both — a schema for the citations and
    claim bookkeeping, and live text so the typing indicator shows real
    words instead of a fake two-second sleep.

    So the JSON streams, and this pulls the current value of one string key
    out of the partial buffer as it grows, handling escapes correctly.
    """

    def __init__(self, field_name: str) -> None:
        self._needle = f'"{field_name}"'
        self._buffer = ""
        self._emitted = 0

    def feed(self, chunk: str) -> str:
        """Return whatever new text of the field has become available."""
        self._buffer += chunk
        value = self._current_value()
        if value is None or len(value) <= self._emitted:
            return ""
        new = value[self._emitted:]
        self._emitted = len(value)
        return new

    def _current_value(self) -> Optional[str]:
        start = self._buffer.find(self._needle)
        if start == -1:
            return None
        cursor = self._buffer.find(":", start + len(self._needle))
        if cursor == -1:
            return None
        cursor += 1
        while cursor < len(self._buffer) and self._buffer[cursor] in " \t\r\n":
            cursor += 1
        if cursor >= len(self._buffer) or self._buffer[cursor] != '"':
            return None
        cursor += 1

        out: list[str] = []
        escapes = {"n": "\n", "t": "\t", "r": "\r", '"': '"', "\\": "\\", "/": "/",
                   "b": "\b", "f": "\f"}
        while cursor < len(self._buffer):
            ch = self._buffer[cursor]
            if ch == "\\":
                if cursor + 1 >= len(self._buffer):
                    break  # escape split across chunks; wait for more
                nxt = self._buffer[cursor + 1]
                if nxt == "u":
                    if cursor + 6 > len(self._buffer):
                        break
                    try:
                        out.append(chr(int(self._buffer[cursor + 2:cursor + 6], 16)))
                    except ValueError:
                        pass
                    cursor += 6
                    continue
                out.append(escapes.get(nxt, nxt))
                cursor += 2
                continue
            if ch == '"':
                break  # field complete
            out.append(ch)
            cursor += 1
        return "".join(out)


# ── Client ───────────────────────────────────────────────────────────────

class LLMClient:
    def __init__(self) -> None:
        self._client: Optional[genai.Client] = None

    @property
    def client(self) -> genai.Client:
        if self._client is None:
            self._client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        return self._client

    @staticmethod
    def _model_for(tier: str, *, allow_fallback: bool = True) -> str:
        if tier != REASONING:
            return settings.fast_model
        preferred = settings.reasoning_model
        if allow_fallback and _circuit_is_open(preferred) \
                and settings.fast_model != preferred:
            log.info("llm.tier_downgraded",
                     extra={"from": preferred, "to": settings.fast_model,
                            "reason": "circuit_open"})
            return settings.fast_model
        return preferred

    @staticmethod
    def _cache_key(model: str, prompt: str, schema: str, system: str) -> str:
        digest = hashlib.sha256(
            "\x00".join([model, schema, system, prompt]).encode("utf-8")
        ).hexdigest()
        return f"llm:v1:{digest}"

    def _config(
        self,
        model: str,
        schema: Optional[Type[BaseModel]],
        system: Optional[str],
        temperature: float,
        max_output_tokens: Optional[int],
        think: bool,
    ) -> types.GenerateContentConfig:
        kwargs: Dict[str, Any] = {
            "temperature": temperature,
            "http_options": types.HttpOptions(
                timeout=int(settings.LLM_TIMEOUT_SECONDS * 1000)
            ),
        }
        if schema is not None:
            kwargs["response_mime_type"] = "application/json"
            kwargs["response_schema"] = schema
        if system:
            kwargs["system_instruction"] = system
        if max_output_tokens:
            kwargs["max_output_tokens"] = max_output_tokens
        # Set the thinking budget explicitly rather than inheriting whatever
        # the tier defaults to: extraction and classification gain nothing
        # from it and pay for the thought tokens.
        #
        # Not every model accepts a zero budget -- gemini-flash-lite rejects
        # it outright with 400 INVALID_ARGUMENT while accepting 128 -- so the
        # floor is learned per model at runtime (see `_call_with_retry`)
        # rather than hard-coded against a capability matrix that Google
        # changes without notice.
        if not think:
            kwargs["thinking_config"] = types.ThinkingConfig(
                thinking_budget=_THINKING_FLOOR.get(model, 0)
            )
        return types.GenerateContentConfig(**kwargs)

    async def generate(
        self,
        prompt: str,
        schema: Type[T],
        *,
        step: str,
        tier: str = FAST,
        system: Optional[str] = None,
        temperature: float = 0.4,
        max_output_tokens: Optional[int] = None,
        think: bool = False,
        ledger: Optional[TokenLedger] = None,
        cache_ttl: Optional[int] = None,
    ) -> T:
        """Generate a schema-conforming object. Raises typed errors, never None."""
        model = self._model_for(tier)
        system_text = system or ""

        if cache_ttl:
            key = self._cache_key(model, prompt, schema.__name__, system_text)
            cached = await get_store().get_json(key)
            if cached is not None:
                try:
                    value = schema.model_validate(cached)
                    log.info("llm.cache_hit", extra={"step": step, "model": model})
                    return value
                except ValidationError:
                    await get_store().delete(key)

        if ledger is not None:
            ledger.ensure_headroom(step)

        def build_for(target: str) -> Callable[[], types.GenerateContentConfig]:
            def build() -> types.GenerateContentConfig:
                return self._config(target, schema, system, temperature,
                                    max_output_tokens, think)
            return build

        try:
            result = await self._call_with_retry(prompt, build_for(model), model, step)
        except LLMRateLimited:
            fallback = settings.fast_model
            if tier != REASONING or fallback == model:
                raise
            _trip_circuit(model)
            log.warning("llm.fallback_tier", extra={"step": step, "from": model,
                                                    "to": fallback})
            model = fallback
            result = await self._call_with_retry(prompt, build_for(model), model, step)

        parsed = result.value
        if isinstance(parsed, schema):
            value = parsed
        else:
            try:
                raw = parsed if isinstance(parsed, dict) else json.loads(result.text)
                value = schema.model_validate(raw)
            except (ValidationError, ValueError, TypeError) as exc:
                log.error(
                    "llm.schema_mismatch",
                    extra={"step": step, "schema": schema.__name__,
                           "error": str(exc)[:300], "sample": result.text[:300]},
                )
                raise LLMInvalidOutput(f"{schema.__name__}: {exc}") from exc

        if ledger is not None:
            ledger.charge(step, result.tokens, 0)

        if cache_ttl:
            await get_store().set_json(
                self._cache_key(model, prompt, schema.__name__, system_text),
                value.model_dump(mode="json"),
                ttl=cache_ttl,
            )
        return value

    async def stream(
        self,
        prompt: str,
        schema: Type[T],
        *,
        step: str,
        stream_field: str,
        tier: str = FAST,
        system: Optional[str] = None,
        temperature: float = 0.5,
        think: bool = False,
        ledger: Optional[TokenLedger] = None,
    ) -> AsyncIterator[Any]:
        """Stream one field's text, then yield the finished object.

        Yields `("text", chunk)` repeatedly and finally `("done", instance)`.
        """
        model = self._model_for(tier)
        if ledger is not None:
            ledger.ensure_headroom(step)
        reader = PartialJSONFieldReader(stream_field)
        buffer: list[str] = []
        tokens = 0
        attempted_fallback = False

        with Timer() as timer:
            try:
                config = self._config(model, schema, system, temperature, None, think)
                stream = await self.client.aio.models.generate_content_stream(
                    model=model, contents=prompt, config=config
                )
                async for chunk in stream:
                    piece = getattr(chunk, "text", None)
                    if piece:
                        buffer.append(piece)
                        new_text = reader.feed(piece)
                        if new_text:
                            yield ("text", new_text)
                    usage = getattr(chunk, "usage_metadata", None)
                    if usage and getattr(usage, "total_token_count", None):
                        tokens = usage.total_token_count
            except Exception as exc:
                err = _classify(exc)
                # A stream that dies part-way has emitted partial text to the
                # caller; restarting on the cheaper tier is still better than
                # losing the turn, and the UI replaces the turn on completion.
                if (
                    isinstance(err, LLMRateLimited)
                    and tier == REASONING
                    and not attempted_fallback
                    and settings.fast_model != model
                ):
                    _trip_circuit(model)
                    attempted_fallback = True
                    model = settings.fast_model
                    log.warning("llm.stream_fallback_tier",
                                extra={"step": step, "to": model})
                    buffer.clear()
                    reader = PartialJSONFieldReader(stream_field)
                    yield ("restart", {"reason": "capacity"})
                    config = self._config(model, schema, system, temperature,
                                          None, think)
                    stream = await self.client.aio.models.generate_content_stream(
                        model=model, contents=prompt, config=config
                    )
                    async for chunk in stream:
                        piece = getattr(chunk, "text", None)
                        if piece:
                            buffer.append(piece)
                            new_text = reader.feed(piece)
                            if new_text:
                                yield ("text", new_text)
                        usage = getattr(chunk, "usage_metadata", None)
                        if usage and getattr(usage, "total_token_count", None):
                            tokens = usage.total_token_count
                else:
                    log.error("llm.stream_failed",
                              extra={"step": step, "model": model,
                                     "error": str(exc)[:200]})
                    raise err from exc

        raw_text = "".join(buffer)
        try:
            value = schema.model_validate(json.loads(raw_text))
        except (ValidationError, ValueError) as exc:
            log.error("llm.stream_schema_mismatch",
                      extra={"step": step, "error": str(exc)[:300], "sample": raw_text[:300]})
            raise LLMInvalidOutput(f"{schema.__name__}: {exc}") from exc

        if ledger is not None:
            ledger.charge(step, tokens, 0)
        metrics.inc("vaadvivaad_llm_calls_total", step=step, outcome="ok")
        metrics.inc("vaadvivaad_llm_tokens_total", tokens, step=step)
        metrics.observe("vaadvivaad_llm_latency_ms", timer.ms, step=step)
        log.info("llm.stream_done", extra={"step": step, "model": model,
                                           "tokens": tokens, "ms": timer.ms})
        yield ("done", value)

    async def _call_with_retry(
        self,
        prompt: str,
        build_config: "Callable[[], types.GenerateContentConfig]",
        model: str,
        step: str,
    ) -> LLMResult:
        last: Optional[LLMError] = None
        for attempt in range(1, settings.LLM_MAX_ATTEMPTS + 1):
            config = build_config()
            try:
                with Timer() as timer:
                    response = await asyncio.wait_for(
                        self.client.aio.models.generate_content(
                            model=model, contents=prompt, config=config
                        ),
                        timeout=settings.LLM_TIMEOUT_SECONDS + 5,
                    )
                usage = getattr(response, "usage_metadata", None)
                tokens = getattr(usage, "total_token_count", 0) or 0
                metrics.inc("vaadvivaad_llm_calls_total", step=step, outcome="ok")
                metrics.inc("vaadvivaad_llm_tokens_total", tokens, step=step)
                metrics.observe("vaadvivaad_llm_latency_ms", timer.ms, step=step)
                log.info(
                    "llm.call",
                    extra={"step": step, "model": model, "tokens": tokens,
                           "ms": timer.ms, "attempt": attempt},
                )
                return LLMResult(
                    value=getattr(response, "parsed", None),
                    text=getattr(response, "text", "") or "",
                    model=model,
                    tokens=tokens,
                    latency_ms=timer.ms,
                    attempts=attempt,
                )
            except Exception as exc:
                last = _classify(exc)
                # A zero thinking budget this model will not accept: raise the
                # floor, remember it, and retry without burning an attempt.
                if (
                    _is_invalid_argument(exc)
                    and config.thinking_config is not None
                    and _THINKING_FLOOR.get(model, 0) < _THINKING_FALLBACK
                ):
                    _THINKING_FLOOR[model] = _THINKING_FALLBACK
                    log.info("llm.thinking_floor_raised",
                             extra={"model": model, "floor": _THINKING_FALLBACK})
                    continue
                if not last.retryable or attempt == settings.LLM_MAX_ATTEMPTS:
                    metrics.inc("vaadvivaad_llm_calls_total", step=step,
                                outcome=last.code)
                    log.error("llm.failed", extra={"step": step, "model": model,
                                                   "attempt": attempt,
                                                   "code": last.code,
                                                   "error": str(exc)[:200]})
                    raise last from exc
                # Exponential backoff with full jitter. The old loop slept a
                # flat 2s on the event loop, which both blocked the server and
                # synchronised every concurrent retry into the same burst.
                delay = min(2 ** (attempt - 1), 8) * (0.5 + random.random())
                log.warning("llm.retry", extra={"step": step, "attempt": attempt,
                                                "code": last.code,
                                                "sleep_s": round(delay, 2)})
                await asyncio.sleep(delay)
        raise last or LLMError("exhausted retries")

    async def embed(self, texts: list[str], *, query: bool = False) -> list[list[float]]:
        """Embed text. Task-specific types are asymmetric and improve recall."""
        try:
            response = await self.client.aio.models.embed_content(
                model=settings.EMBEDDING_MODEL,
                contents=texts,
                config=types.EmbedContentConfig(
                    task_type="RETRIEVAL_QUERY" if query else "RETRIEVAL_DOCUMENT",
                    output_dimensionality=settings.EMBEDDING_DIMENSIONS,
                ),
            )
            return [e.values for e in response.embeddings]
        except Exception as exc:
            raise _classify(exc) from exc


llm = LLMClient()
