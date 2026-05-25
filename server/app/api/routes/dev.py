import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.core.config import settings
from app.models.integration import Integration
from app.models.user import User
from app.schemas.dev import DevChatRequest
from app.services.brain import (
    InteractionChannel,
    process_message,
    process_proactive_check_in,
)
from app.services.context import AgentMode, assemble_context
from app.services.prompt import system_instruction_for
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


@router.get("/context")
async def dev_inspect_context(
    current_user: User = Depends(get_current_user),
    mode: str = Query(default="reactive", description="reactive | proactive"),
    channel: str = Query(default="dashboard", description="dashboard | whatsapp | dev"),
    message: str = Query(default="(your message here)"),
) -> dict[str, Any]:
    """Return the exact prompt + system instruction that Gemini would receive.

    Useful for verifying integrations are landing in context. Compare with the
    `bundle_summary` to see whether a missing section is a sync issue (no doc
    in Mongo) or a rendering issue (doc exists but not shown).
    """
    if not settings.enable_dev_routes:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    try:
        agent_mode = AgentMode(mode)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown mode '{mode}'. Use reactive or proactive.",
        )
    try:
        interaction_channel = InteractionChannel(channel)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown channel '{channel}'",
        )

    bundle = await assemble_context(current_user)
    prompt = bundle.render_prompt(
        mode=agent_mode, channel=interaction_channel, user_message=message
    )
    system_instruction = system_instruction_for(agent_mode)

    integrations = await Integration.find(
        Integration.user.id == current_user.id
    ).to_list()
    integrations_summary = [
        {
            "provider": i.provider,
            "status": i.status,
            "last_synced_at": i.last_synced_at.isoformat() if i.last_synced_at else None,
            "last_sync_summary": i.last_sync_summary,
            "last_sync_error": i.last_sync_error,
        }
        for i in integrations
    ]

    bundle_summary = {
        "memories": [
            {
                "title": m.title,
                "context_type": m.context_type,
                "source": m.source,
                "importance": m.importance,
            }
            for m in bundle.memories
        ],
        "live_signals": [
            {
                "title": s.title,
                "source": s.source,
                "source_ref": s.source_ref,
                "updated_at": s.updated_at.isoformat(),
                "summary": s.summary,
            }
            for s in bundle.live_signals
        ],
        "history_count": len(bundle.history),
    }

    notes: list[str] = []
    sources = {s.source for s in bundle.live_signals}
    has_calendar_integration = any(
        i.provider == "google_calendar" for i in integrations
    )
    if has_calendar_integration and "google_calendar" not in sources:
        gc_int = next(
            (i for i in integrations if i.provider == "google_calendar"), None
        )
        if gc_int and gc_int.last_synced_at is None:
            notes.append(
                "Google Calendar is connected but has never synced. "
                "Click 'Sync now' on the Integrations tab."
            )
        elif gc_int and gc_int.last_sync_error:
            notes.append(
                f"Google Calendar last sync failed: {gc_int.last_sync_error}"
            )
        else:
            notes.append(
                "Google Calendar synced but no LongTermContext doc with "
                "source='google_calendar' exists. Check server logs."
            )
    if not has_calendar_integration:
        notes.append("No Google Calendar integration is connected for this user.")

    return {
        "mode": agent_mode.value,
        "channel": interaction_channel.value,
        "system_instruction": system_instruction,
        "prompt": prompt,
        "prompt_chars": len(prompt),
        "bundle_summary": bundle_summary,
        "integrations": integrations_summary,
        "notes": notes,
    }
