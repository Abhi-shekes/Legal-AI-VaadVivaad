"""Typed application errors.

The previous code returned `None` on failure and let a `TypeError` surface
several frames away, which made "server is busy" the only message a user ever
saw. Each error here carries a `code` the frontend can branch on and a
`user_message` that is safe to show verbatim.
"""

from __future__ import annotations

from typing import Any, Dict, Optional


class VaadVivaadError(Exception):
    """Base class. `user_message` is always safe to display."""

    code = "internal_error"
    http_status = 500
    user_message = "Something went wrong on our side. Please try again."
    retryable = False

    def __init__(
        self,
        detail: str = "",
        *,
        user_message: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> None:
        super().__init__(detail or self.__class__.user_message)
        self.detail = detail
        if user_message:
            self.user_message = user_message
        self.context: Dict[str, Any] = context or {}

    def to_payload(self) -> Dict[str, Any]:
        return {"code": self.code, "message": self.user_message, "retryable": self.retryable}


# ── Upstream model / vector store ────────────────────────────────────────

class LLMError(VaadVivaadError):
    code = "llm_error"
    http_status = 502
    user_message = "The reasoning service did not respond. Please try again."
    retryable = True


class LLMTimeout(LLMError):
    code = "llm_timeout"
    http_status = 504
    user_message = "That took too long to generate. Please try again."


class LLMRateLimited(LLMError):
    code = "llm_rate_limited"
    http_status = 429
    user_message = "We are at capacity right now. Please try again in a minute."


class LLMInvalidOutput(LLMError):
    code = "llm_invalid_output"
    user_message = "We could not produce a well-formed result. Please try again."


class RetrievalError(VaadVivaadError):
    code = "retrieval_error"
    http_status = 502
    user_message = "Legal research is temporarily unavailable."
    retryable = True


# ── Budget / quota ───────────────────────────────────────────────────────

class BudgetExceeded(VaadVivaadError):
    code = "budget_exceeded"
    http_status = 429
    user_message = ("This debate reached its processing limit. "
                    "The transcript so far has been saved.")


class RateLimited(VaadVivaadError):
    code = "rate_limited"
    http_status = 429
    user_message = "You have made too many requests. Please wait a moment."
    retryable = True

    def __init__(self, retry_after: int = 60, **kwargs: Any) -> None:
        super().__init__(f"retry after {retry_after}s", **kwargs)
        self.retry_after = retry_after
        self.user_message = (
            f"You have made too many requests. Please try again in "
            f"{retry_after} second{'s' if retry_after != 1 else ''}."
        )


# ── Request / auth ───────────────────────────────────────────────────────

class NotAuthenticated(VaadVivaadError):
    code = "not_authenticated"
    http_status = 401
    user_message = "Please sign in to continue."


class PermissionDenied(VaadVivaadError):
    code = "permission_denied"
    http_status = 403
    user_message = "You do not have access to this case."


class NotFound(VaadVivaadError):
    code = "not_found"
    http_status = 404
    user_message = "We could not find that."


class ValidationFailed(VaadVivaadError):
    code = "validation_failed"
    http_status = 422
    user_message = "Some of the details provided are not usable."


# ── Guard layer ──────────────────────────────────────────────────────────

class OutOfScope(VaadVivaadError):
    """Not an error so much as a routing decision — carries guidance."""

    code = "out_of_scope"
    http_status = 200
    user_message = (
        "This service argues Indian criminal matters. Describe an incident — "
        "what happened, when, and who was involved — and both sides will argue it."
    )


class SafetyReferral(VaadVivaadError):
    code = "safety_referral"
    http_status = 200
    user_message = "Support resources are available."


class UnsafeRequest(VaadVivaadError):
    code = "unsafe_request"
    http_status = 200
    user_message = (
        "This service argues cases from the record; it cannot help plan an "
        "offence or conceal one. If you are describing something that has "
        "already happened, say so and it can be argued."
    )
