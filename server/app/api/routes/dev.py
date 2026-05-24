import logging
from typing import Any

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.models.user import User
from app.schemas.dev import DevChatRequest
from app.services.brain import generate_reply_for_user
from app.services.user_context import find_user_by_whatsapp

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dev", tags=["dev"])


@router.post("/chat")
async def dev_chat(body: DevChatRequest) -> dict[str, Any]:
    if not settings.enable_dev_routes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    user: User | None = None
    if body.whatsapp_number:
        user = await find_user_by_whatsapp(body.whatsapp_number)

    if user is None:
        user = await User.find_one()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No user found. Register via /api/auth/register first.",
        )

    try:
        reply = await generate_reply_for_user(user, body.message)
    except Exception as exc:
        logger.exception("Dev chat failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return {
        "user_id": str(user.id),
        "display_name": user.identity.display_name,
        "whatsapp_number": user.contact.whatsapp_number,
        "reply": reply,
    }
