import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status

from app.integrations.whatsapp.twilio import (
    parse_twilio_form,
    send_whatsapp_message,
    validate_twilio_request,
)
from app.services.brain import UNKNOWN_USER_REPLY, generate_reply_for_user
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
    if user is None:
        reply = UNKNOWN_USER_REPLY
    else:
        try:
            reply = await generate_reply_for_user(user, inbound.body)
        except Exception:
            logger.exception("Failed to generate reply for user %s", user.id)
            reply = (
                "I'm having trouble thinking right now. Please try again in a moment."
            )

    message_sid: str | None = None
    send_error: str | None = None
    try:
        message_sid = send_whatsapp_message(inbound.from_number, reply)
    except Exception as exc:
        logger.exception(
            "Failed to send outbound WhatsApp message to %s",
            inbound.from_number,
        )
        send_error = type(exc).__name__

    return {
        "status": "ok",
        "reply": reply,
        "outbound_sid": message_sid,
        "user_found": user is not None,
        "send_error": send_error,
    }
