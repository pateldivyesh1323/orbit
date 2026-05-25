from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.models.user import User
from app.models.user_profile import CheckInFrequency

logger = logging.getLogger(__name__)

DEFAULT_QUIET_START = "22:00:00"
DEFAULT_QUIET_END = "08:00:00"

FREQUENCY_INTERVAL = {
    "off": None,
    "low": timedelta(hours=12),
    "medium": timedelta(hours=4),
    "high": timedelta(minutes=90),
}


@dataclass
class CheckInDecision:
    should_send: bool
    reason: str


def _parse_hhmm(value: str | None) -> time | None:
    if not value:
        return None
    try:
        parts = value.split(":")
        hh = int(parts[0])
        mm = int(parts[1]) if len(parts) > 1 else 0
        return time(hour=hh, minute=mm)
    except (ValueError, IndexError):
        return None


def _is_in_quiet_window(
    now_local: time,
    start: time,
    end: time,
) -> bool:
    if start == end:
        return False
    if start < end:
        return start <= now_local < end
    # Wraps midnight (e.g., 22:00 → 08:00)
    return now_local >= start or now_local < end


def _user_now(user: User) -> datetime:
    try:
        return datetime.now(ZoneInfo(user.location.timezone))
    except ZoneInfoNotFoundError:
        return datetime.now(timezone.utc)


def evaluate_check_in(user: User, *, now_utc: datetime | None = None) -> CheckInDecision:
    """Decide whether the cron should send a proactive check-in to this user right now."""
    prefs = user.orbit_preferences
    now_utc = now_utc or datetime.now(timezone.utc)

    if not prefs.proactive_nudges_enabled:
        return CheckInDecision(False, "proactive_nudges_disabled")

    frequency: CheckInFrequency = prefs.check_in_frequency
    interval = FREQUENCY_INTERVAL.get(frequency)
    if interval is None:
        return CheckInDecision(False, "frequency_off")

    if prefs.snooze_until and prefs.snooze_until > now_utc:
        return CheckInDecision(False, "snoozed")

    last = prefs.last_proactive_check_in_at
    if last is not None and (now_utc - last) < interval:
        return CheckInDecision(False, "interval_not_reached")

    quiet_start = _parse_hhmm(prefs.quiet_hours_start) or _parse_hhmm(DEFAULT_QUIET_START)
    quiet_end = _parse_hhmm(prefs.quiet_hours_end) or _parse_hhmm(DEFAULT_QUIET_END)
    if quiet_start and quiet_end:
        local_now = _user_now(user).time()
        if _is_in_quiet_window(local_now, quiet_start, quiet_end):
            return CheckInDecision(False, "quiet_hours")

    return CheckInDecision(True, "due")
