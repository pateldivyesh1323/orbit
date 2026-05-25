from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from google.genai import types

from app.integrations.google_calendar.client import (
    CalendarAuthError,
    CalendarError,
    list_events,
)
from app.integrations.google_calendar.sync import (
    GoogleCalendarSyncError,
    _ensure_access_token,
)
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)

MAX_RANGE_DAYS = 30
DEFAULT_MAX_RESULTS = 25
HARD_MAX_RESULTS = 100


declaration = types.FunctionDeclaration(
    name="get_calendar_events",
    description=(
        "Fetch the user's Google Calendar events for a date range. Use this when the "
        "user asks about their schedule, meetings, free time, or events on specific "
        "days. Returns events from the user's primary calendar in their local timezone. "
        "If Google Calendar is not connected, the tool will return an error and you "
        "should suggest the user connect it via Dashboard → Integrations."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "start_date": types.Schema(
                type=types.Type.STRING,
                description=(
                    "First day to include, YYYY-MM-DD in the user's local timezone. "
                    "Defaults to today if omitted."
                ),
            ),
            "end_date": types.Schema(
                type=types.Type.STRING,
                description=(
                    "Last day to include (inclusive), YYYY-MM-DD in the user's local "
                    "timezone. Defaults to the same as start_date (single day)."
                ),
            ),
            "max_results": types.Schema(
                type=types.Type.INTEGER,
                description=f"Max events to return. Default {DEFAULT_MAX_RESULTS}, max {HARD_MAX_RESULTS}.",
            ),
        },
        required=[],
    ),
)


def _user_tz(user: User) -> ZoneInfo:
    try:
        return ZoneInfo(user.location.timezone)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def _parse_date(value: str | None, default: date) -> date:
    if not value:
        return default
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise ValueError(f"Invalid date '{value}', expected YYYY-MM-DD") from exc


def _human_time(dt: datetime) -> str:
    return dt.strftime("%I:%M %p").lstrip("0")


def _format_event(event: dict[str, Any], tz: ZoneInfo) -> dict[str, Any] | None:
    start_raw = event.get("start") or {}
    end_raw = event.get("end") or {}

    if "dateTime" in start_raw and "dateTime" in end_raw:
        start = datetime.fromisoformat(start_raw["dateTime"]).astimezone(tz)
        end = datetime.fromisoformat(end_raw["dateTime"]).astimezone(tz)
        all_day = False
    elif "date" in start_raw and "date" in end_raw:
        start = datetime.combine(
            date.fromisoformat(start_raw["date"]), time.min, tzinfo=tz
        )
        end = datetime.combine(
            date.fromisoformat(end_raw["date"]), time.min, tzinfo=tz
        )
        all_day = True
    else:
        return None

    return {
        "title": event.get("summary") or "(no title)",
        "date": start.strftime("%a %b %d"),
        "start": "all day" if all_day else _human_time(start),
        "end": "all day" if all_day else _human_time(end),
        "all_day": all_day,
        "location": event.get("location") or None,
        "duration_minutes": int((end - start).total_seconds() // 60),
    }


async def handle(
    *,
    user: User,
    start_date: str | None = None,
    end_date: str | None = None,
    max_results: int | None = None,
) -> dict[str, Any]:
    integration = await Integration.find_one(
        Integration.user.id == user.id,
        Integration.provider == "google_calendar",
    )
    if integration is None:
        return {
            "ok": False,
            "error": "not_linked",
            "message": "Google Calendar is not connected. Tell the user to connect it in Dashboard → Integrations.",
        }
    if integration.status == "error":
        return {
            "ok": False,
            "error": "integration_error",
            "message": (
                f"Google Calendar integration is in an error state: "
                f"{integration.last_sync_error or 'unknown error'}. "
                "Tell the user to reconnect from the Integrations tab."
            ),
        }

    tz = _user_tz(user)
    today_local = datetime.now(tz).date()

    try:
        start = _parse_date(start_date, today_local)
        end = _parse_date(end_date, start)
    except ValueError as exc:
        return {"ok": False, "error": "bad_date", "message": str(exc)}

    if end < start:
        return {
            "ok": False,
            "error": "bad_range",
            "message": "end_date must be on or after start_date",
        }
    if (end - start).days > MAX_RANGE_DAYS:
        return {
            "ok": False,
            "error": "range_too_wide",
            "message": f"Range too wide; max {MAX_RANGE_DAYS} days",
        }

    cap = max_results or DEFAULT_MAX_RESULTS
    cap = max(1, min(cap, HARD_MAX_RESULTS))

    try:
        access_token = await _ensure_access_token(integration)
    except (GoogleCalendarSyncError, Exception) as exc:
        logger.warning("Calendar token refresh failed for user=%s: %s", user.id, exc)
        return {
            "ok": False,
            "error": "auth_failed",
            "message": "Could not refresh Google Calendar access. User may need to reconnect.",
        }

    time_min = datetime.combine(start, time.min, tzinfo=tz)
    time_max = datetime.combine(end + timedelta(days=1), time.min, tzinfo=tz)

    try:
        raw_events = await list_events(
            access_token, time_min=time_min, time_max=time_max, max_results=cap
        )
    except CalendarAuthError:
        return {
            "ok": False,
            "error": "auth_failed",
            "message": "Google rejected the access token. User should reconnect Google Calendar.",
        }
    except CalendarError as exc:
        return {
            "ok": False,
            "error": "calendar_api_failed",
            "message": str(exc),
        }

    events: list[dict[str, Any]] = []
    for raw in raw_events:
        formatted = _format_event(raw, tz)
        if formatted:
            events.append(formatted)

    return {
        "ok": True,
        "range": {
            "start": start.isoformat(),
            "end": end.isoformat(),
            "timezone": str(tz),
        },
        "count": len(events),
        "events": events,
    }
