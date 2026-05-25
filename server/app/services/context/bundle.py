from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from app.models.context import LongTermContext
from app.models.conversation import ConversationMessage
from app.models.user import User
from app.services.channels import InteractionChannel
from app.services.context.sections import (
    render_history_block,
    render_live_signals_block,
    render_user_profile_block,
)
from app.services.conversation import load_recent_messages
from app.services.user_context import load_live_signals, load_user_memories


class AgentMode(str, Enum):
    REACTIVE = "reactive"
    PROACTIVE = "proactive"


@dataclass
class ContextBundle:
    user: User
    memories: list[LongTermContext] = field(default_factory=list)
    live_signals: list[LongTermContext] = field(default_factory=list)
    history: list[ConversationMessage] = field(default_factory=list)

    def render_prompt(
        self,
        *,
        mode: AgentMode,
        channel: InteractionChannel,
        user_message: str | None = None,
    ) -> str:
        sections = [
            render_user_profile_block(self.user, self.memories),
            render_live_signals_block(self.live_signals),
            render_history_block(self.history),
        ]
        body = "".join(s for s in sections if s)

        if mode == AgentMode.REACTIVE:
            channel_label = (
                "WhatsApp message"
                if channel == InteractionChannel.WHATSAPP
                else "Message"
            )
            task = f"\n\n## Current {channel_label}\n{(user_message or '').strip()}"
        else:
            task = _proactive_task_block(channel)

        return f"{body}{task}"


def _proactive_task_block(channel: InteractionChannel) -> str:
    medium = "WhatsApp" if channel == InteractionChannel.WHATSAPP else "the dashboard"
    return (
        "\n\n## Current task — proactive check-in\n"
        f"You are initiating contact with the user via {medium}. They did not just message you. "
        "Use the context above (live activity, profile, memories, recent conversation) to decide what to say.\n"
        "- If you have something genuinely useful — a relevant nudge, a check on a goal, a "
        "follow-up on yesterday's activity — say it concisely (1–3 sentences) and end with an "
        "open question or a small actionable suggestion.\n"
        "- If recent conversation already covered the topic, or there is nothing useful to add right "
        "now, respond with the single token <SKIP> (no other text). Do not send filler greetings.\n"
        "- Respect the user's communication style and quiet preferences. Never repeat yourself.\n"
    )


async def assemble_context(user: User) -> ContextBundle:
    memories = await load_user_memories(user)
    live_signals = await load_live_signals(user)
    history = await load_recent_messages(user)
    return ContextBundle(
        user=user,
        memories=memories,
        live_signals=live_signals,
        history=history,
    )
