import re

E164_PATTERN = re.compile(r"^\+[1-9]\d{6,14}$")


def normalize_whatsapp_number(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    if not stripped:
        return None

    cleaned = re.sub(r"[\s\-().]", "", stripped)
    if not cleaned.startswith("+"):
        cleaned = f"+{cleaned}"

    if not E164_PATTERN.fullmatch(cleaned):
        raise ValueError(
            "WhatsApp number must include country code in E.164 format, e.g. +14155552671"
        )

    return cleaned
