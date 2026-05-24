import logging
from typing import Any

from fastapi import APIRouter, Request

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/webhook", tags=["webhook"])

ECHO_REPLY = "Orbit received your message. Phase 1 echo is active."


@router.post("/whatsapp")
async def whatsapp_webhook(request: Request) -> dict[str, Any]:
    body: dict[str, Any] = await request.json()
    logger.info("WhatsApp webhook received: %s", body)
    return {
        "received": body,
        "reply": ECHO_REPLY,
    }
