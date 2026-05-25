import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.dev import DevChatRequest
from app.services.brain import (
    InteractionChannel,
    process_message,
    process_proactive_check_in,
)
from app.services.scheduling import evaluate_check_in
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

    result = await process_message(
        body.message,
        user=user,
        channel=InteractionChannel.DEV,
    )
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=result.reply,
        )

    return {
        "user_id": result.user_id,
        "display_name": result.display_name,
        "whatsapp_number": user.contact.whatsapp_number,
        "reply": result.reply,
    }


@router.post("/proactive-nudge")
async def dev_proactive_nudge(
    current_user: User = Depends(get_current_user),
    force: bool = Query(
        default=True,
        description="Bypass interval/quiet-hours/snooze gates. Defaults to true.",
    ),
    channel: str = Query(
        default="dashboard",
        description="dashboard | whatsapp | dev",
    ),
) -> dict[str, Any]:
    """Force-fire a proactive check-in for the authenticated user (dev-only).

    Does NOT send via WhatsApp — just runs the proactive brain and returns the
    generated reply, tool calls, and what the rule gate would have said. Iterate
    on the proactive prompt without waiting for the interval.
    """
    if not settings.enable_dev_routes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    try:
        interaction_channel = InteractionChannel(channel)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown channel '{channel}'",
        )

    decision = evaluate_check_in(current_user)
    if not decision.should_send and not force:
        return {
            "fired": False,
            "rule_gate": {"should_send": False, "reason": decision.reason},
        }

    result = await process_proactive_check_in(
        current_user, channel=interaction_channel
    )

    return {
        "fired": True,
        "rule_gate": {"should_send": decision.should_send, "reason": decision.reason},
        "skipped_by_agent": result.skipped,
        "reply": result.reply,
        "tool_calls": result.tool_calls,
        "channel": interaction_channel.value,
    }
