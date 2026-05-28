from __future__ import annotations

import logging
from typing import Any

from google.genai import types

from app.models.context import LongTermContext
from app.models.user import User

logger = logging.getLogger(__name__)

VALID_CONTEXT_TYPES = (
    "fact",
    "preference",
    "habit",
    "health",
    "work",
    "relationship",
    "goal_progress",
    "insight",
    "other",
)


declaration = types.FunctionDeclaration(
    name="add_memory",
    description=(
        "Save a durable fact to the user's long-term memory. Use ONLY when the "
        "user explicitly asks you to remember something — e.g. 'remember that "
        "I'm allergic to peanuts', 'note that my standup is at 10am', 'add to "
        "my profile that I prefer tea over coffee'. Do NOT call this proactively "
        "to capture facts from chat — a background extractor already handles that. "
        "Use this only for explicit user requests."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "title": types.Schema(
                type=types.Type.STRING,
                description=(
                    "Short declarative title, 4–10 words. e.g. "
                    "'Allergic to peanuts'. Will be shown in the Memory tab."
                ),
            ),
            "content": types.Schema(
                type=types.Type.STRING,
                description=(
                    "The actual fact, 1–2 sentences. Self-contained so it's "
                    "readable months from now without chat context."
                ),
            ),
            "context_type": types.Schema(
                type=types.Type.STRING,
                description=(
                    "Category of memory. One of: fact, preference, habit, "
                    "health, work, relationship, goal_progress, insight, other."
                ),
            ),
            "importance": types.Schema(
                type=types.Type.INTEGER,
                description="1–10. Defaults to 7 since user explicitly asked. Use 8+ for life-defining facts.",
            ),
            "tags": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(type=types.Type.STRING),
                description="Optional short tags for searchability.",
            ),
        },
        required=["title", "content", "context_type"],
    ),
)


async def handle(
    *,
    user: User,
    title: str,
    content: str,
    context_type: str,
    importance: int | None = None,
    tags: list[str] | None = None,
) -> dict[str, Any]:
    if context_type not in VALID_CONTEXT_TYPES:
        return {
            "ok": False,
            "error": "invalid_context_type",
            "message": f"context_type must be one of {VALID_CONTEXT_TYPES}",
        }

    clean_title = title.strip()
    clean_content = content.strip()
    if len(clean_title) < 3 or len(clean_content) < 3:
        return {
            "ok": False,
            "error": "too_short",
            "message": "title and content must be non-trivial",
        }

    importance_val = max(1, min(10, importance or 7))
    clean_tags = [t.strip() for t in (tags or []) if t.strip()][:6]

    doc = LongTermContext(
        user=user,
        context_type=context_type,  # type: ignore[arg-type]
        title=clean_title,
        content=clean_content,
        importance=importance_val,
        confidence=1.0,
        source="manual",
        source_ref="tool:add_memory",
        tags=clean_tags + ["user-requested"],
    )
    await doc.insert()
    logger.info(
        "Memory saved via tool user=%s title=%r type=%s",
        user.id,
        clean_title,
        context_type,
    )

    return {
        "ok": True,
        "id": str(doc.id),
        "title": doc.title,
        "context_type": doc.context_type,
        "importance": doc.importance,
        "message": f"Saved '{clean_title}' to memory.",
    }
