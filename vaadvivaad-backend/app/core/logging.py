"""Structured logging.

Replaces the `print()` calls that were the previous logging strategy. Emits
one JSON object per line in production (so a log shipper can index it) and a
readable line in development.

Correlation ids ride on a ContextVar rather than being threaded through every
function signature, so any log line emitted while handling a request or
running a debate automatically carries `request_id` / `debate_id` / `user_id`.
That is the difference between "why was this debate slow" being answerable
and not.

Deliberately stdlib-only: `structlog` would be a reasonable dependency but
buys little over this for the shape of logging this service does.
"""

from __future__ import annotations

import json
import logging
import sys
import time
import uuid
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Dict, Iterator, Optional

_context: ContextVar[Dict[str, Any]] = ContextVar("log_context", default={})

# Attributes present on every LogRecord; anything else a caller passed via
# `extra=` is treated as a structured field worth emitting.
_STANDARD = frozenset(
    """args asctime created exc_info exc_text filename funcName levelname
    levelno lineno module msecs message msg name pathname process
    processName relativeCreated stack_info thread threadName taskName""".split()
)


def bind(**kwargs: Any) -> None:
    """Add fields to the ambient logging context for this task."""
    _context.set({**_context.get(), **{k: v for k, v in kwargs.items() if v is not None}})


def get_context() -> Dict[str, Any]:
    return dict(_context.get())


@contextmanager
def context(**kwargs: Any) -> Iterator[None]:
    """Bind fields for the duration of a block, then restore."""
    token = _context.set({**_context.get(), **{k: v for k, v in kwargs.items() if v is not None}})
    try:
        yield
    finally:
        _context.reset(token)


def new_request_id() -> str:
    return uuid.uuid4().hex[:16]


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: Dict[str, Any] = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created))
            + f".{int(record.msecs):03d}Z",
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        payload.update(_context.get())
        for key, value in record.__dict__.items():
            if key not in _STANDARD and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        try:
            return json.dumps(payload, default=str, ensure_ascii=False)
        except (TypeError, ValueError):
            return json.dumps({"ts": payload["ts"], "level": payload["level"],
                               "logger": payload["logger"], "msg": payload["msg"]})


class _ConsoleFormatter(logging.Formatter):
    _COLOURS = {"DEBUG": "\033[38;5;244m", "INFO": "\033[38;5;110m",
                "WARNING": "\033[38;5;179m", "ERROR": "\033[38;5;167m",
                "CRITICAL": "\033[38;5;161m"}
    _RESET = "\033[0m"

    def __init__(self, colour: bool = True) -> None:
        super().__init__()
        self.colour = colour

    def format(self, record: logging.LogRecord) -> str:
        fields = {**_context.get()}
        for key, value in record.__dict__.items():
            if key not in _STANDARD and not key.startswith("_"):
                fields[key] = value
        suffix = " ".join(f"{k}={v}" for k, v in fields.items())
        stamp = time.strftime("%H:%M:%S", time.localtime(record.created))
        level = record.levelname[:4]
        if self.colour:
            tint = self._COLOURS.get(record.levelname, "")
            level = f"{tint}{level}{self._RESET}"
        line = f"{stamp} {level} {record.name:28s} {record.getMessage()}"
        if suffix:
            line += f"  \033[38;5;244m{suffix}\033[0m" if self.colour else f"  {suffix}"
        if record.exc_info:
            line += "\n" + self.formatException(record.exc_info)
        return line


def configure(level: str = "INFO", console: bool = False) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(
        _ConsoleFormatter(colour=sys.stdout.isatty()) if console else _JsonFormatter()
    )
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(level.upper())

    # These are chatty at INFO and say nothing we don't already log ourselves.
    for noisy in ("httpx", "httpcore", "engineio.server", "socketio.server",
                  "google_genai.models", "urllib3", "qdrant_client"):
        logging.getLogger(noisy).setLevel(logging.WARNING)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)


class Timer:
    """Measure a block and report it in milliseconds.

    Used to attribute latency per debate step, which is the number that tells
    you whether the fan-out actually parallelised.
    """

    def __init__(self) -> None:
        self.ms: float = 0.0
        self._start = 0.0

    def __enter__(self) -> "Timer":
        self._start = time.perf_counter()
        return self

    def __exit__(self, *exc: object) -> None:
        self.ms = round((time.perf_counter() - self._start) * 1000, 1)
