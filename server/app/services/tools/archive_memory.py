from __future__ import annotations

import logging
from typing import Any

from google.genai import types

from app.models.context import LongTermContext
from app.models.user import User

logger = logging.getLogger(__name__)


declaration = types.FunctionDeclaration(
    name="archive_memory",
    description=(
        "Archive a long-term memory by its exact title (case-insensitive). "
        "Use ONLY when the user explicitly asks to forget, delete, archive, or "
        "remove something they previously told Orbit. The title must match one "
        "of the entries listed under '## Long-term memory' in the current "
        "context. If the user is vague ('forget that thing'), ask them to "
        "specify which memory before calling this. Archived memories are "
        "hidden from future prompts but can be restored from the dashboard."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "title": types.Schema(
                type=types.Type.STRING,
                description=(
                    "Exact title of the memory to archive. Match the title text "
                    "shown under '## Long-term memory' in the context above."
                ),
            ),
        },
        required=["title"],
    ),
)


async def handle(*, user: User, title: str) -> dict[str, Any]:
    needle = title.strip().lower()
    if not needle:
        return {"ok": False, "error": "empty_title"}

    docs = await LongTermContext.find(
        LongTermContext.user.id == user.id,
        LongTermContext.is_archived == False,
    ).to_list()

    matches = [d for d in docs if d.title.strip().lower() == needle]

    if not matches:
        return {
            "ok": False,
            "error": "not_found",
            "message": (
                f"No active memory found with title '{title}'. Tell the user "
                "you couldn't find it and ask them to be more specific."
            ),
        }
    if len(matches) > 1:
        return {
            "ok": False,
            "error": "ambiguous",
            "matches": [{"id": str(d.id), "title": d.title} for d in matches],
            "message": (
                f"Multiple memories match '{title}'. Ask the user to clarify "
                "which one — list the matching titles and source types."
            ),
        }

    doc = matches[0]
    doc.is_archived = True
    doc.touch_updated()
    await doc.save()
    logger.info(
        "Memory archived via tool user=%s title=%r id=%s",
        user.id,
        doc.title,
        doc.id,
    )

    return {
        "ok": True,
        "id": str(doc.id),
        "title": doc.title,
        "message": f"Archived '{doc.title}'.",
    }
