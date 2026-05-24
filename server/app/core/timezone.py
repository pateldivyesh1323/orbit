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
