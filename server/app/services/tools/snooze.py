from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from google.genai import types

from app.models.user import User

logger = logging.getLogger(__name__)

MAX_SNOOZE_MINUTES = 7 * 24 * 60  # one week


declaration = types.FunctionDeclaration(
    name="snooze_check_ins",
    description=(
        "Pause Orbit's proactive check-ins (the messages Orbit sends on its own schedule) "
        "for a given duration. Use this when the user asks not to be disturbed, wants quiet "
        "time, is in a meeting, going to sleep, on vacation, etc. Does NOT affect the user's "
        "ability to message Orbit — only stops Orbit from initiating. Set duration_minutes "
        "to 0 to clear an existing snooze."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "duration_minutes": types.Schema(
                type=types.Type.INTEGER,
                description=(
                    "How many minutes to pause check-ins. Use 0 to cancel an existing snooze. "
                    f"Maximum {MAX_SNOOZE_MINUTES} minutes (one week)."
                ),
            ),
            "reason": types.Schema(
                type=types.Type.STRING,
                description="Optional short reason the user gave (e.g. 'in a meeting', 'sleeping').",
            ),
        },
        required=["duration_minutes"],
    ),
)


async def handle(*, user: User, duration_minutes: int, reason: str | None = None) -> dict:
    if duration_minutes <= 0:
        previous = user.orbit_preferences.snooze_until
        user.orbit_preferences.snooze_until = None
        user.touch_updated()
        await user.save()
        logger.info("Cleared snooze for user=%s (was %s)", user.id, previous)
        return {
            "ok": True,
            "action": "cleared",
            "message": "Snooze cleared — proactive check-ins resume now.",
        }

    duration = min(duration_minutes, MAX_SNOOZE_MINUTES)
    until = datetime.now(timezone.utc) + timedelta(minutes=duration)
    user.orbit_preferences.snooze_until = until
    user.touch_updated()
    await user.save()
    logger.info(
        "Snoozed user=%s for %s minutes (until %s) reason=%r",
        user.id,
        duration,
        until.isoformat(),
        reason,
    )

    return {
        "ok": True,
        "action": "snoozed",
        "minutes": duration,
        "snoozed_until_utc": until.isoformat(),
        "reason": reason,
        "message": (
            f"Snoozed for {duration} minutes. I won't send proactive check-ins until "
            f"{until.isoformat()} UTC."
        ),
    }
