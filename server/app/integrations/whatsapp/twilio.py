import logging
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, Request, status
from twilio.rest import Client
from twilio.request_validator import RequestValidator

from app.core.config import settings
from app.core.phone import normalize_whatsapp_number

logger = logging.getLogger(__name__)


@dataclass
class InboundWhatsAppMessage:
    from_number: str
    to_number: str
    body: str
    message_sid: str | None


def parse_whatsapp_address(raw: str) -> str:
    value = raw.strip()
    if value.lower().startswith("whatsapp:"):
        return value.split(":", 1)[1].strip()
    return value


def parse_twilio_form(form: dict[str, Any]) -> InboundWhatsAppMessage:
    from_raw = str(form.get("From", ""))
    body = str(form.get("Body", "")).strip()
    return InboundWhatsAppMessage(
        from_number=parse_whatsapp_address(from_raw),
        to_number=parse_whatsapp_address(str(form.get("To", ""))),
        body=body,
        message_sid=form.get("MessageSid"),
    )


async def validate_twilio_request(request: Request, form: dict[str, Any]) -> None:
    if not settings.twilio_validate_signatures:
        return
    if not settings.twilio_auth_token:
        # Validation is enabled but no auth token is configured. Fail closed —
        # an unconfigured validator must never silently accept forged webhooks.
        logger.error(
            "TWILIO_VALIDATE_SIGNATURES is on but TWILIO_AUTH_TOKEN is unset; "
            "rejecting webhook (fail-closed)."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Twilio signature validation is misconfigured",
        )

    signature = request.headers.get("X-Twilio-Signature", "")
    url = settings.twilio_webhook_url or str(request.url)
    validator = RequestValidator(settings.twilio_auth_token)
    if not validator.validate(url, form, signature):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid Twilio signature",
        )


def send_whatsapp_message(to_number: str, body: str) -> str | None:
    if not settings.twilio_configured:
        logger.warning("Twilio not configured; skipping outbound WhatsApp send")
        return None

    normalized_to = normalize_whatsapp_number(to_number) or to_number
    from_address = settings.twilio_whatsapp_from
    if not from_address:
        return None

    if not from_address.lower().startswith("whatsapp:"):
        from_address = f"whatsapp:{from_address}"

    to_address = normalized_to
    if not to_address.lower().startswith("whatsapp:"):
        to_address = f"whatsapp:{to_address}"

    client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    message = client.messages.create(
        from_=from_address,
        to=to_address,
        body=body,
    )
    return message.sid
