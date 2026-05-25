from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.integrations.whatsapp.twilio import send_whatsapp_message
from app.models.conversation import ConversationMessage
from app.models.user import User
from app.services.brain import process_proactive_check_in
from app.services.channels import InteractionChannel
from app.services.scheduling import evaluate_check_in

logger = logging.getLogger(__name__)


async def run_proactive_check_ins() -> dict:
    """Iterate all users and send proactive check-ins to those that are due."""
    users = await User.find(User.is_active == True).to_list()
    stats = {
        "users_total": len(users),
        "considered": 0,
        "sent": 0,
        "skipped_by_agent": 0,
        "skipped_by_rules": 0,
        "errors": 0,
        "reasons": {},
    }
    now_utc = datetime.now(timezone.utc)

    for user in users:
        stats["considered"] += 1
        decision = evaluate_check_in(user, now_utc=now_utc)
        if not decision.should_send:
            stats["skipped_by_rules"] += 1
            stats["reasons"][decision.reason] = (
                stats["reasons"].get(decision.reason, 0) + 1
            )
            continue

        channel = (
            InteractionChannel.WHATSAPP
            if user.contact.whatsapp_number
            else InteractionChannel.DASHBOARD
        )

        try:
            result = await process_proactive_check_in(user, channel=channel)
        except Exception:
            logger.exception("Proactive run failed for user=%s", user.id)
            stats["errors"] += 1
            continue

        if result.skipped or not result.success:
            stats["skipped_by_agent"] += 1
            continue

        external_id: str | None = None
        if channel == InteractionChannel.WHATSAPP and user.contact.whatsapp_number:
            try:
                external_id = send_whatsapp_message(
                    user.contact.whatsapp_number, result.reply
                )
            except Exception:
                logger.exception(
                    "Failed to send proactive WhatsApp to user=%s", user.id
                )
                stats["errors"] += 1
                continue

        assistant_doc = ConversationMessage(
            user=user,
            role="assistant",
            content=result.reply,
            channel=channel.value,  # type: ignore[arg-type]
            external_id=external_id or f"proactive:{user.id}:{now_utc.isoformat()}",
        )
        await assistant_doc.insert()
        stats["sent"] += 1

    return stats
