from __future__ import annotations

import logging
from datetime import datetime, time, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.integration_security import decrypt_secret, encrypt_secret
from app.integrations.google_calendar.client import (
    CalendarAuthError,
    CalendarError,
    list_events,
)
from app.integrations.google_calendar.oauth import (
    OAuthExchangeError,
    refresh_access_token,
)
from app.models.context import LongTermContext
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)

CALENDAR_SOURCE_REF = "google_calendar:rolling"
TOKEN_REFRESH_BUFFER = timedelta(minutes=2)


class GoogleCalendarSyncError(Exception):
    pass


def _user_tz(user: User) -> ZoneInfo:
    try:
        return ZoneInfo(user.location.timezone)
    except ZoneInfoNotFoundError:
        return ZoneInfo("UTC")


def _parse_event_dt(value: dict[str, Any], tz: ZoneInfo) -> tuple[datetime, bool]:
    """Returns (datetime, all_day)."""
    if "dateTime" in value:
        return datetime.fromisoformat(value["dateTime"]).astimezone(tz), False
    if "date" in value:
        d = datetime.fromisoformat(value["date"])
        return datetime.combine(d.date(), time.min, tzinfo=tz), True
    raise GoogleCalendarSyncError(f"Calendar event has neither dateTime nor date: {value}")


def _format_event(event: dict[str, Any], tz: ZoneInfo) -> dict[str, Any]:
    start_dt, all_day_start = _parse_event_dt(event.get("start") or {}, tz)
    end_dt, all_day_end = _parse_event_dt(event.get("end") or {}, tz)
    return {
        "summary": event.get("summary") or "(no title)",
        "start": start_dt,
        "end": end_dt,
        "all_day": all_day_start and all_day_end,
        "location": event.get("location"),
    }


def _human_time(dt: datetime) -> str:
    return dt.strftime("%I:%M %p").lstrip("0")


def _human_duration(seconds: float) -> str:
    minutes = int(seconds // 60)
    if minutes < 60:
        return f"{minutes}m"
    hours, rem = divmod(minutes, 60)
    if rem == 0:
        return f"{hours}h"
    return f"{hours}h {rem}m"


def _free_blocks(
    events: list[dict[str, Any]],
    *,
    day_start: datetime,
    day_end: datetime,
    min_block_minutes: int = 30,
) -> list[tuple[datetime, datetime]]:
    """Find gaps between events within [day_start, day_end] that are >= min_block_minutes."""
    blocks: list[tuple[datetime, datetime]] = []
    cursor = day_start
    sorted_events = sorted(
        (e for e in events if not e["all_day"]),
        key=lambda e: e["start"],
    )
    for event in sorted_events:
        if event["start"] >= day_end:
            break
        if event["start"] > cursor:
            gap = (event["start"] - cursor).total_seconds() / 60
            if gap >= min_block_minutes:
                blocks.append((cursor, event["start"]))
        cursor = max(cursor, event["end"])
    if cursor < day_end:
        gap = (day_end - cursor).total_seconds() / 60
        if gap >= min_block_minutes:
            blocks.append((cursor, day_end))
    return blocks


def _build_blocks(
    today_events: list[dict[str, Any]],
    tomorrow_events: list[dict[str, Any]],
    *,
    now: datetime,
    tz: ZoneInfo,
) -> tuple[str, str]:
    """Returns (summary_text, content_text)."""
    upcoming = [
        e for e in today_events if not e["all_day"] and e["end"] > now
    ]
    next_event = upcoming[0] if upcoming else None

    summary_parts: list[str] = []
    if next_event:
        delta = next_event["start"] - now
        if delta.total_seconds() <= 0:
            summary_parts.append(f"In progress: {next_event['summary']} until {_human_time(next_event['end'])}")
        else:
            mins = int(delta.total_seconds() // 60)
            when = f"in {mins} min" if mins < 60 else f"at {_human_time(next_event['start'])}"
            summary_parts.append(f"Next: {next_event['summary']} {when}")
    elif today_events:
        summary_parts.append("No more events today")
    else:
        summary_parts.append("Nothing on the calendar today")

    if upcoming:
        summary_parts.append(f"{len(upcoming)} event(s) left today")

    content_lines: list[str] = []
    content_lines.append(f"Today ({now.strftime('%A, %B %d')}):")
    if not today_events:
        content_lines.append("  (no events)")
    else:
        for ev in today_events:
            if ev["all_day"]:
                content_lines.append(f"  All day — {ev['summary']}")
            else:
                content_lines.append(
                    f"  {_human_time(ev['start'])}–{_human_time(ev['end'])} {ev['summary']}"
                    + (f" @ {ev['location']}" if ev.get("location") else "")
                )

    day_start = max(now, now.replace(hour=8, minute=0, second=0, microsecond=0))
    day_end = now.replace(hour=20, minute=0, second=0, microsecond=0)
    if day_start < day_end:
        free = _free_blocks(today_events, day_start=day_start, day_end=day_end)
        if free:
            content_lines.append("")
            content_lines.append("Free blocks today (≥30 min, 08:00–20:00):")
            for start, end in free[:5]:
                content_lines.append(
                    f"  {_human_time(start)}–{_human_time(end)} "
                    f"({_human_duration((end - start).total_seconds())})"
                )

    if tomorrow_events:
        tomorrow_label = (now + timedelta(days=1)).strftime("%A, %B %d")
        content_lines.append("")
        content_lines.append(f"Tomorrow ({tomorrow_label}):")
        for ev in tomorrow_events[:6]:
            if ev["all_day"]:
                content_lines.append(f"  All day — {ev['summary']}")
            else:
                content_lines.append(
                    f"  {_human_time(ev['start'])}–{_human_time(ev['end'])} {ev['summary']}"
                )

    return " · ".join(summary_parts), "\n".join(content_lines)


async def _ensure_access_token(integration: Integration) -> str:
    """Return a valid access token, refreshing if expired."""
    creds = integration.credentials
    encrypted_access = creds.get("access_token")
    encrypted_refresh = creds.get("refresh_token")
    expires_iso = creds.get("expires_at")

    if not encrypted_refresh:
        raise GoogleCalendarSyncError("Missing refresh token; reconnect Google Calendar")

    now = datetime.now(timezone.utc)
    expires_at = None
    if expires_iso:
        try:
            expires_at = datetime.fromisoformat(expires_iso)
        except ValueError:
            expires_at = None

    if encrypted_access and expires_at and expires_at - now > TOKEN_REFRESH_BUFFER:
        return decrypt_secret(encrypted_access)

    refresh_token = decrypt_secret(encrypted_refresh)
    payload = await refresh_access_token(refresh_token)
    access_token = payload["access_token"]
    expires_in = int(payload.get("expires_in", 3600))
    new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    integration.credentials["access_token"] = encrypt_secret(access_token)
    integration.credentials["expires_at"] = new_expires_at.isoformat()
    integration.touch_updated()
    await integration.save()
    return access_token


async def sync_google_calendar(
    integration: Integration, user: User
) -> LongTermContext:
    try:
        access_token = await _ensure_access_token(integration)
    except OAuthExchangeError as exc:
        raise GoogleCalendarSyncError(f"Could not refresh Google token: {exc}") from exc

    tz = _user_tz(user)
    now_local = datetime.now(tz)
    today_start = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
    tomorrow_end = today_start + timedelta(days=2)

    try:
        raw_events = await list_events(
            access_token, time_min=today_start, time_max=tomorrow_end
        )
    except CalendarAuthError:
        # Force refresh on next sync — clear access token only.
        integration.credentials.pop("access_token", None)
        integration.credentials.pop("expires_at", None)
        integration.touch_updated()
        await integration.save()
        raise
    except CalendarError:
        raise

    today_date = today_start.date()
    tomorrow_date = today_date + timedelta(days=1)
    today_events: list[dict[str, Any]] = []
    tomorrow_events: list[dict[str, Any]] = []
    for raw in raw_events:
        try:
            formatted = _format_event(raw, tz)
        except GoogleCalendarSyncError:
            continue
        d = formatted["start"].date()
        if d == today_date:
            today_events.append(formatted)
        elif d == tomorrow_date:
            tomorrow_events.append(formatted)

    summary_text, content_text = _build_blocks(
        today_events, tomorrow_events, now=now_local, tz=tz
    )

    metadata = {
        "today_count": len(today_events),
        "tomorrow_count": len(tomorrow_events),
        "synced_at": datetime.now(timezone.utc).isoformat(),
        "timezone": str(tz),
    }

    existing = await LongTermContext.find_one(
        LongTermContext.user.id == user.id,
        LongTermContext.source_ref == CALENDAR_SOURCE_REF,
    )

    if existing is None:
        doc = LongTermContext(
            user=user,
            context_type="other",
            title="Today's calendar",
            content=content_text,
            summary=summary_text,
            importance=8,
            source="google_calendar",
            source_ref=CALENDAR_SOURCE_REF,
            tags=["google_calendar", "schedule"],
            metadata=metadata,
        )
        await doc.insert()
        return doc

    existing.content = content_text
    existing.summary = summary_text
    existing.metadata = metadata
    existing.is_archived = False
    existing.touch_updated()
    await existing.save()
    return existing
