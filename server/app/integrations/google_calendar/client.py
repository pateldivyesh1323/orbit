from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

import httpx

logger = logging.getLogger(__name__)

CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3"


class CalendarAuthError(Exception):
    pass


class CalendarError(Exception):
    pass


async def list_events(
    access_token: str,
    *,
    time_min: datetime,
    time_max: datetime,
    calendar_id: str = "primary",
    max_results: int = 50,
) -> list[dict[str, Any]]:
    """Fetch events between time_min and time_max (RFC3339, with TZ)."""
    headers = {"Authorization": f"Bearer {access_token}"}
    params = {
        "timeMin": time_min.isoformat(),
        "timeMax": time_max.isoformat(),
        "singleEvents": "true",
        "orderBy": "startTime",
        "maxResults": str(max_results),
    }

    async with httpx.AsyncClient(timeout=15.0) as http:
        response = await http.get(
            f"{CALENDAR_API_BASE}/calendars/{calendar_id}/events",
            headers=headers,
            params=params,
        )

    if response.status_code == 401:
        raise CalendarAuthError("Access token rejected by Google Calendar")
    if response.status_code >= 400:
        raise CalendarError(
            f"Calendar request failed ({response.status_code}): {response.text[:200]}"
        )

    return response.json().get("items", [])
