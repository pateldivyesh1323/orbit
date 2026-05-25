from datetime import datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def normalize_timezone(value: str) -> str:
    stripped = value.strip()
    if not stripped:
        raise ValueError("Timezone is required")

    try:
        ZoneInfo(stripped)
    except ZoneInfoNotFoundError as exc:
        raise ValueError(
            f"Unknown timezone '{stripped}'. Use an IANA name like America/New_York."
        ) from exc

    return stripped


def format_user_local_datetime(timezone: str) -> str | None:
    try:
        now = datetime.now(ZoneInfo(timezone))
    except ZoneInfoNotFoundError:
        return None

    return now.strftime("%A, %B %d, %Y at %I:%M %p %Z")


def get_user_now(timezone: str) -> datetime | None:
    try:
        return datetime.now(ZoneInfo(timezone))
    except ZoneInfoNotFoundError:
        return None


def part_of_day(now: datetime) -> str:
    """Human-readable label for the hour, useful for grounding the model."""
    hour = now.hour
    if hour < 4:
        return "late night / overnight"
    if hour < 6:
        return "pre-dawn"
    if hour < 9:
        return "early morning"
    if hour < 12:
        return "morning"
    if hour < 14:
        return "midday"
    if hour < 17:
        return "afternoon"
    if hour < 20:
        return "evening"
    if hour < 23:
        return "night"
    return "late night"
