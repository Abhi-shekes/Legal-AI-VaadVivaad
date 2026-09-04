"""MongoDB access.

Adds the indexes the collections never had — `debates.user_id` was an
unindexed full-collection scan on every dashboard load, and `users.email`
had no unique constraint, so two concurrent signups could both pass the
"does this email exist" check.

Debate state is persisted here per turn, which is what makes a hearing
survive a disconnect or a backend restart.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, DESCENDING, TEXT, ReturnDocument

from app.core.errors import NotFound, PermissionDenied
from app.core.logging import get_logger
from app.db.mongodb import db
from app.domain.schemas import utcnow

log = get_logger(__name__)


async def ensure_indexes() -> None:
    """Idempotent. Called once at startup."""
    try:
        await db.users.create_index([("email", ASCENDING)], unique=True, name="uniq_email")
        await db.debates.create_index(
            [("user_id", ASCENDING), ("created_at", DESCENDING)], name="by_user_recent"
        )
        await db.debates.create_index([("debate_id", ASCENDING)], unique=True,
                                      name="uniq_debate_id")
        await db.debates.create_index([("stage", ASCENDING)], name="by_stage")
        # Backs the MongoDB fallback in `services/search.py`. Only the fields
        # named here are searchable, which is exactly why Meilisearch exists:
        # this cannot reach the transcript.
        await db.debates.create_index(
            [("description", TEXT), ("case.summary", TEXT), ("case.crime_type", TEXT)],
            name="case_text",
        )
        await db.refresh_tokens.create_index([("jti", ASCENDING)], unique=True,
                                             name="uniq_jti")
        # Expired refresh tokens and revocations clean themselves up.
        await db.refresh_tokens.create_index([("expires_at", ASCENDING)],
                                             expireAfterSeconds=0, name="ttl_expiry")
        log.info("db.indexes_ready")
    except Exception as exc:  # a duplicate-key on an existing collection is fine
        log.warning("db.index_failed", extra={"error": str(exc)[:200]})


def oid(value: str) -> ObjectId:
    try:
        return ObjectId(value)
    except (InvalidId, TypeError) as exc:
        raise NotFound("invalid id") from exc


# ── Debates ──────────────────────────────────────────────────────────────

async def save_debate_state(state: Dict[str, Any]) -> None:
    """Upsert the full debate state. Called after every committed turn.

    The search index is updated from here rather than from each of the five
    call sites that save, so a hearing cannot become findable on one path and
    not another. `index_debate` ignores anything still in progress and never
    raises, so search being down cannot cost someone their transcript.

    Imported late: `db` is a lower layer than `services`, and importing
    upwards at module scope would make the cycle real.
    """
    await db.debates.update_one(
        {"debate_id": state["debate_id"]},
        {"$set": state},
        upsert=True,
    )
    from app.services import search

    await search.index_debate(state)


async def load_debate_state(debate_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    doc = await db.debates.find_one({"debate_id": debate_id})
    if doc is None:
        return None
    if doc.get("user_id") != user_id:
        raise PermissionDenied("debate belongs to another user")
    doc.pop("_id", None)
    return doc


async def list_debates(user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
    cursor = (
        db.debates.find(
            {"user_id": user_id},
            {
                "debate_id": 1, "stage": 1, "created_at": 1, "updated_at": 1,
                "case.summary": 1, "case.crime_type": 1, "sections": 1,
                "ruling.favoured_side": 1, "ruling.disposition": 1,
                "ruling.confidence": 1, "turns": 1,
            },
        )
        .sort("created_at", DESCENDING)
        .limit(limit)
    )
    out: List[Dict[str, Any]] = []
    async for doc in cursor:
        case = doc.get("case") or {}
        sections = doc.get("sections") or []
        ruling = doc.get("ruling") or {}
        summary = case.get("summary") or ""
        out.append({
            "id": doc["debate_id"],
            # Derived from the confirmed structure at read time from stored
            # fields -- the old dashboard guessed at two possible shapes and
            # fell back to the literal string "Unknown Case".
            "title": _title_for(case, sections),
            "summary": summary[:180],
            "status": doc.get("stage", "unknown"),
            "sections": [s.get("section") for s in sections if s.get("section")],
            "turns": len(doc.get("turns") or []),
            "outcome": ruling.get("favoured_side"),
            "confidence": ruling.get("confidence"),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
        })
    return out


def _title_for(case: Dict[str, Any], sections: List[Dict[str, Any]]) -> str:
    crime = (case.get("crime_type") or "").strip()
    section = (sections[0].get("section") if sections else "") or ""
    if crime and section:
        return f"{crime.title()} — s.{section}"
    if crime:
        return crime.title()
    summary = (case.get("summary") or "").strip()
    return (summary[:60] + "…") if len(summary) > 60 else (summary or "Untitled matter")


async def delete_debate(debate_id: str, user_id: str) -> bool:
    result = await db.debates.delete_one({"debate_id": debate_id, "user_id": user_id})
    if result.deleted_count:
        from app.services import search

        await search.remove_debate(debate_id)
    return result.deleted_count > 0


async def count_debates(user_id: str) -> int:
    return await db.debates.count_documents({"user_id": user_id})


# ── Users ────────────────────────────────────────────────────────────────

async def find_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    return await db.users.find_one({"email": email.lower().strip()})


async def create_user(name: str, email: str, hashed_password: str) -> Optional[str]:
    """Returns the new id, or None when the email is already taken.

    Relies on the unique index rather than a check-then-insert, which was
    racy: two simultaneous signups could both see "no such user" and both
    insert.
    """
    from pymongo.errors import DuplicateKeyError

    try:
        result = await db.users.insert_one({
            "name": name.strip(),
            "email": email.lower().strip(),
            "hashed_password": hashed_password,
            "created_at": utcnow().isoformat(),
            "preferences": {},
        })
        return str(result.inserted_id)
    except DuplicateKeyError:
        return None


async def get_user(user_id: str) -> Optional[Dict[str, Any]]:
    return await db.users.find_one({"_id": oid(user_id)})


async def set_preferences(user_id: str, preferences: Dict[str, Any]) -> Dict[str, Any]:
    """Cross-case memory is preferences only.

    Never facts from one matter carried into another — that would be both a
    confidentiality breach and a correctness hazard.
    """
    doc = await db.users.find_one_and_update(
        {"_id": oid(user_id)},
        {"$set": {f"preferences.{k}": v for k, v in preferences.items()}},
        return_document=ReturnDocument.AFTER,
    )
    return (doc or {}).get("preferences", {})


# ── Refresh tokens ───────────────────────────────────────────────────────

async def store_refresh_token(jti: str, user_id: str, expires_at: Any) -> None:
    await db.refresh_tokens.insert_one({
        "jti": jti, "user_id": user_id,
        "expires_at": expires_at, "created_at": utcnow(),
    })


async def refresh_token_valid(jti: str) -> bool:
    return await db.refresh_tokens.find_one({"jti": jti}) is not None


async def revoke_refresh_token(jti: str) -> None:
    """Logout means something now: the token is gone server-side."""
    await db.refresh_tokens.delete_one({"jti": jti})


async def revoke_all_for_user(user_id: str) -> int:
    result = await db.refresh_tokens.delete_many({"user_id": user_id})
    return result.deleted_count
