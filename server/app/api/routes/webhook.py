import logging
from typing import Any

from fastapi import APIRouter, Request

from app.integrations.whatsapp.twilio import (
    parse_twilio_form,
    send_whatsapp_message,
    validate_twilio_request,
)
from app.services.brain import InteractionChannel, process_message
from app.services.user_context import find_user_by_whatsapp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhook", tags=["webhook"])


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request) -> dict[str, Any]:
    form = dict(await request.form())
    await validate_twilio_request(request, form)

    inbound = parse_twilio_form(form)
    logger.info(
        "WhatsApp inbound from=%s sid=%s",
        inbound.from_number,
        inbound.message_sid,
    )

    user = await find_user_by_whatsapp(inbound.from_number)
    result = await process_message(
        inbound.body,
        user=user,
        channel=InteractionChannel.WHATSAPP,
    )

    message_sid: str | None = None
    send_error: str | None = None
    try:
        message_sid = send_whatsapp_message(inbound.from_number, result.reply)
    except Exception as exc:
        logger.exception(
            "Failed to send outbound WhatsApp message to %s",
            inbound.from_number,
        )
        send_error = type(exc).__name__

    return {
        "status": "ok",
        "reply": result.reply,
        "outbound_sid": message_sid,
        "user_found": user is not None,
        "success": result.success,
        "send_error": send_error,
    }
