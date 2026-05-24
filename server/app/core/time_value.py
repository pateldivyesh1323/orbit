import re
from datetime import time

TIME_VALUE_PATTERN = re.compile(r"^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$")


def normalize_time_value(value: str | time | None) -> str | None:
    if value is None:
        return None

    if isinstance(value, time):
        return value.strftime("%H:%M:%S")

    stripped = str(value).strip()
    if not stripped:
        return None

    if len(stripped) == 5:
        stripped = f"{stripped}:00"

    if not TIME_VALUE_PATTERN.fullmatch(stripped):
        raise ValueError("Time must be in HH:MM or HH:MM:SS format")

    return stripped
