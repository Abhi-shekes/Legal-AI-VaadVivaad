"""In-process metrics, exposed in Prometheus text format.

The plan originally reached for a hosted LLM-observability product. That is
not needed and not wanted here: this project runs on free, self-hosted parts
with Gemini as the only external service, so the metrics are collected in
process and scraped by whatever the operator runs — Prometheus and Grafana
are both open source and both optional.

No dependency: the Prometheus exposition format is a few lines of text, and
`prometheus_client` would buy little for the handful of series this emits.

What is worth measuring here is spend and grounding, not just traffic:
tokens per debate step, how often the circuit breaker trips, and how many
fabricated citations were caught — that last one is the health of the whole
product in a single number.
"""

from __future__ import annotations

import threading
import time
from collections import defaultdict
from typing import Dict, Iterable, List, Tuple

_lock = threading.Lock()

# name -> {labels_tuple: value}
_counters: Dict[str, Dict[Tuple[Tuple[str, str], ...], float]] = defaultdict(dict)
_gauges: Dict[str, Dict[Tuple[Tuple[str, str], ...], float]] = defaultdict(dict)
# name -> {labels: (count, sum)}
_summaries: Dict[str, Dict[Tuple[Tuple[str, str], ...], Tuple[int, float]]] = defaultdict(dict)

_HELP = {
    "vaadvivaad_llm_calls_total": "Model calls, by step and outcome.",
    "vaadvivaad_llm_tokens_total": "Tokens charged, by step.",
    "vaadvivaad_llm_latency_ms": "Model call latency in milliseconds, by step.",
    "vaadvivaad_llm_circuit_trips_total": "Times a model's circuit breaker opened.",
    "vaadvivaad_debates_total": "Hearings, by terminal stage.",
    "vaadvivaad_debate_turns_total": "Turns generated, by side and phase.",
    "vaadvivaad_citations_total": "Citations, by whether they survived verification.",
    "vaadvivaad_ratelimit_blocked_total": "Requests refused by the rate limiter, by bucket.",
    "vaadvivaad_guard_decisions_total": "Scope-guard outcomes, by decision.",
    "vaadvivaad_corpus_size": "Documents in the retrieval corpus.",
    "vaadvivaad_build_info": "Build metadata.",
}


def _key(labels: Dict[str, str]) -> Tuple[Tuple[str, str], ...]:
    return tuple(sorted((k, str(v)) for k, v in labels.items()))


def inc(name: str, value: float = 1.0, **labels: str) -> None:
    with _lock:
        bucket = _counters[name]
        key = _key(labels)
        bucket[key] = bucket.get(key, 0.0) + value


def gauge(name: str, value: float, **labels: str) -> None:
    with _lock:
        _gauges[name][_key(labels)] = value


def observe(name: str, value: float, **labels: str) -> None:
    with _lock:
        bucket = _summaries[name]
        key = _key(labels)
        count, total = bucket.get(key, (0, 0.0))
        bucket[key] = (count + 1, total + value)


def _render_labels(key: Tuple[Tuple[str, str], ...]) -> str:
    if not key:
        return ""
    inner = ",".join(f'{k}="{_escape(v)}"' for k, v in key)
    return "{" + inner + "}"


def _escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", " ")


def render() -> str:
    """Prometheus text exposition."""
    lines: List[str] = []

    def emit(name: str, kind: str, rows: Iterable[Tuple[str, float]]) -> None:
        rows = list(rows)
        if not rows:
            return
        if name in _HELP:
            lines.append(f"# HELP {name} {_HELP[name]}")
        lines.append(f"# TYPE {name} {kind}")
        lines.extend(f"{series} {value:g}" for series, value in rows)

    with _lock:
        for name, series in sorted(_counters.items()):
            emit(name, "counter",
                 ((f"{name}{_render_labels(k)}", v) for k, v in sorted(series.items())))
        for name, series in sorted(_gauges.items()):
            emit(name, "gauge",
                 ((f"{name}{_render_labels(k)}", v) for k, v in sorted(series.items())))
        for name, series in sorted(_summaries.items()):
            rows: List[Tuple[str, float]] = []
            for k, (count, total) in sorted(series.items()):
                rows.append((f"{name}_count{_render_labels(k)}", count))
                rows.append((f"{name}_sum{_render_labels(k)}", total))
            emit(name, "summary", rows)

    lines.append(f"# TYPE vaadvivaad_uptime_seconds gauge")
    lines.append(f"vaadvivaad_uptime_seconds {time.time() - _STARTED:g}")
    return "\n".join(lines) + "\n"


def reset() -> None:
    """Test seam."""
    with _lock:
        _counters.clear()
        _gauges.clear()
        _summaries.clear()


_STARTED = time.time()
