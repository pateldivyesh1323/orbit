from __future__ import annotations

import logging
from typing import Any

from google.genai import types

from app.models.user import User

logger = logging.getLogger(__name__)

VALID_FIELDS = ("personal_goals", "weekly_priorities", "focus_areas")
VALID_ACTIONS = ("add", "remove")


declaration = types.FunctionDeclaration(
    name="update_goals",
    description=(
        "Modify one of the user's stated goal lists: personal_goals, "
        "weekly_priorities, or focus_areas. Use this ONLY when the user "
        "explicitly asks to add, remove, or change one of these — e.g. "
        "'add finish the deck to my weekly priorities' or 'remove Valorant "
        "from my focus areas'. Do NOT call this for ambient mentions or "
        "speculative changes. One call per item; call multiple times if the "
        "user asks for multiple changes."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "field": types.Schema(
                type=types.Type.STRING,
                description=(
                    "Which list to modify. One of: personal_goals (long-running "
                    "life goals), weekly_priorities (this week's focus), "
                    "focus_areas (broad domains like 'health', 'research')."
                ),
            ),
            "action": types.Schema(
                type=types.Type.STRING,
                description="'add' to append, 'remove' to delete (case-insensitive match).",
            ),
            "value": types.Schema(
                type=types.Type.STRING,
                description="The text of the goal/priority/focus area.",
            ),
        },
        required=["field", "action", "value"],
    ),
)


async def handle(
    *, user: User, field: str, action: str, value: str
) -> dict[str, Any]:
    if field not in VALID_FIELDS:
        return {
            "ok": False,
            "error": "invalid_field",
            "message": f"field must be one of {VALID_FIELDS}",
        }
    if action not in VALID_ACTIONS:
        return {
            "ok": False,
            "error": "invalid_action",
            "message": f"action must be one of {VALID_ACTIONS}",
        }

    cleaned = value.strip()
    if not cleaned:
        return {"ok": False, "error": "empty_value", "message": "value is empty"}

    current: list[str] = list(getattr(user.goals, field) or [])

    if action == "add":
        if any(v.strip().lower() == cleaned.lower() for v in current):
            return {
                "ok": False,
                "error": "already_exists",
                "message": f"'{cleaned}' is already in {field}",
                "current": current,
            }
        current.append(cleaned)
    else:
        before = len(current)
        current = [v for v in current if v.strip().lower() != cleaned.lower()]
        if len(current) == before:
            return {
                "ok": False,
                "error": "not_found",
                "message": f"'{cleaned}' wasn't in {field}",
                "current": current,
            }

    setattr(user.goals, field, current)
    user.touch_updated()
    await user.save()

    logger.info(
        "Goals updated user=%s field=%s action=%s value=%r",
        user.id,
        field,
        action,
        cleaned,
    )

    return {
        "ok": True,
        "field": field,
        "action": action,
        "value": cleaned,
        "current": current,
    }
