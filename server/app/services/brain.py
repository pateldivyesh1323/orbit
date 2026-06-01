from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, AsyncIterator

from app.models.user import User
from app.services.channels import InteractionChannel
from app.services.context import AgentMode, assemble_context
from app.services.conversation import save_conversation_turn
from app.services.gemini import generate_orbit_reply, generate_orbit_reply_stream
from app.services.memory_extraction import extract_and_save_memories
from app.services.prompt import system_instruction_for
from app.services.tools import build_user_tool_bindings

logger = logging.getLogger(__name__)

UNKNOWN_USER_REPLY = (
    "Hi! I'm Orbit. I don't recognize this WhatsApp number yet. "
    "Sign up at your Orbit dashboard and add this number to your profile, then message me again."
)

EMPTY_MESSAGE_REPLY = "I didn't catch a message. Send me some text and I'll help."

GENERATION_ERROR_REPLY = (
    "I'm having trouble thinking right now. Please try again in a moment."
)

PROACTIVE_SKIP_TOKEN = "<SKIP>"


@dataclass
class OrbitInteractionResult:
    reply: str
    user: User | None
    channel: InteractionChannel
    mode: AgentMode = AgentMode.REACTIVE
    success: bool = True
    skipped: bool = False
    tool_calls: list[dict] = field(default_factory=list)

    @property
    def user_id(self) -> str | None:
        return str(self.user.id) if self.user else None

    @property
    def display_name(self) -> str | None:
        if self.user is None:
            return None
        return self.user.identity.display_name


async def stream_message(
    message: str,
    *,
    user: User,
    channel: InteractionChannel,
) -> AsyncIterator[dict[str, Any]]:
    """Reactive path, streamed. Yields JSON-serializable events:

    {"type": "chunk", "text": ...}      incremental assistant text
    {"type": "tool",  "name", "ok"}     a tool was executed
    {"type": "done",  "content": ...}   final assistant message (persisted)
    {"type": "error", "message": ...}   generation failed
    """
    text = message.strip()
    if not text:
        yield {"type": "done", "content": EMPTY_MESSAGE_REPLY}
        return

    try:
        bundle = await assemble_context(user, query=text)
        prompt = bundle.render_prompt(
            mode=AgentMode.REACTIVE, channel=channel, user_message=text
        )
        tools = await build_user_tool_bindings(user)
        logger.info(
            "Streaming reactive reply user=%s channel=%s history=%s signals=%s",
            user.id,
            channel.value,
            len(bundle.history),
            len(bundle.live_signals),
        )

        collected: list[str] = []
        async for event in generate_orbit_reply_stream(
            prompt,
            system_instruction=system_instruction_for(AgentMode.REACTIVE),
            tools=tools,
        ):
            if event.kind == "chunk":
                collected.append(event.text)
                yield {"type": "chunk", "text": event.text}
            elif event.kind == "tool":
                yield {
                    "type": "tool",
                    "name": event.tool_name,
                    "ok": bool(event.tool_result and event.tool_result.get("ok")),
                }

        reply = "".join(collected).strip() or GENERATION_ERROR_REPLY
        await save_conversation_turn(
            user,
            channel.value,  # type: ignore[arg-type]
            text,
            reply,
        )
        asyncio.create_task(extract_and_save_memories(user, text, reply, channel))
        yield {"type": "done", "content": reply}
    except Exception:
        logger.exception(
            "Orbit streaming generation failed user=%s channel=%s",
            user.id,
            channel.value,
        )
        yield {"type": "error", "message": GENERATION_ERROR_REPLY}


async def process_message(
    message: str,
    *,
    user: User | None,
    channel: InteractionChannel,
    external_id: str | None = None,
) -> OrbitInteractionResult:
    """Reactive path — the user just sent a message and expects a reply."""
    text = message.strip()
    if not text:
        return OrbitInteractionResult(
            reply=EMPTY_MESSAGE_REPLY, user=user, channel=channel
        )

    if user is None:
        if channel == InteractionChannel.WHATSAPP:
            return OrbitInteractionResult(
                reply=UNKNOWN_USER_REPLY, user=None, channel=channel
            )
        return OrbitInteractionResult(
            reply=GENERATION_ERROR_REPLY,
            user=None,
            channel=channel,
            success=False,
        )

    try:
        bundle = await assemble_context(user, query=text)
        prompt = bundle.render_prompt(
            mode=AgentMode.REACTIVE, channel=channel, user_message=text
        )
        tools = await build_user_tool_bindings(user)
        logger.info(
            "Generating reactive reply user=%s channel=%s history=%s signals=%s",
            user.id,
            channel.value,
            len(bundle.history),
            len(bundle.live_signals),
        )
        gemini_reply = await generate_orbit_reply(
            prompt,
            system_instruction=system_instruction_for(AgentMode.REACTIVE),
            tools=tools,
        )
        reply = gemini_reply.text or GENERATION_ERROR_REPLY
        await save_conversation_turn(
            user,
            channel.value,  # type: ignore[arg-type]
            text,
            reply,
            external_id=external_id,
        )
        asyncio.create_task(
            extract_and_save_memories(user, text, reply, channel)
        )
        return OrbitInteractionResult(
            reply=reply,
            user=user,
            channel=channel,
            mode=AgentMode.REACTIVE,
            tool_calls=gemini_reply.tool_calls,
        )
    except Exception:
        logger.exception(
            "Orbit reactive generation failed user=%s channel=%s",
            user.id,
            channel.value,
        )
        return OrbitInteractionResult(
            reply=GENERATION_ERROR_REPLY,
            user=user,
            channel=channel,
            success=False,
        )


async def process_proactive_check_in(
    user: User,
    *,
    channel: InteractionChannel,
) -> OrbitInteractionResult:
    """Proactive path — Orbit initiates contact. The reply may be <SKIP> to stay quiet."""
    try:
        bundle = await assemble_context(user)
        prompt = bundle.render_prompt(
            mode=AgentMode.PROACTIVE, channel=channel, user_message=None
        )
        tools = await build_user_tool_bindings(user)
        logger.info(
            "Generating proactive check-in user=%s channel=%s",
            user.id,
            channel.value,
        )
        gemini_reply = await generate_orbit_reply(
            prompt,
            system_instruction=system_instruction_for(AgentMode.PROACTIVE),
            tools=tools,
        )
        text = (gemini_reply.text or "").strip()
        is_skip = not text or text == PROACTIVE_SKIP_TOKEN or text.startswith(
            f"{PROACTIVE_SKIP_TOKEN}\n"
        )
        if is_skip:
            logger.info(
                "Proactive skip for user=%s raw_reply=%r", user.id, text[:200]
            )
            return OrbitInteractionResult(
                reply=text,
                user=user,
                channel=channel,
                mode=AgentMode.PROACTIVE,
                skipped=True,
                tool_calls=gemini_reply.tool_calls,
            )

        user.orbit_preferences.last_proactive_check_in_at = datetime.now(timezone.utc)
        user.touch_updated()
        await user.save()

        return OrbitInteractionResult(
            reply=text,
            user=user,
            channel=channel,
            mode=AgentMode.PROACTIVE,
            tool_calls=gemini_reply.tool_calls,
        )
    except Exception:
        logger.exception("Proactive check-in failed user=%s", user.id)
        return OrbitInteractionResult(
            reply="",
            user=user,
            channel=channel,
            mode=AgentMode.PROACTIVE,
            success=False,
            skipped=True,
        )
