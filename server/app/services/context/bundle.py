from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from app.models.context import LongTermContext
from app.models.conversation import ConversationMessage
from app.models.user import User
from app.services.channels import InteractionChannel
from app.services.context.sections import (
    render_current_time_block,
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
            render_current_time_block(self.user),
            "\n" + render_user_profile_block(self.user, self.memories),
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
        "Send a short, useful message (1–3 sentences) ending with one focused question or a tiny "
        "actionable suggestion. Pick the most relevant angle from the context:\n"
        "- Their stated goals, focus areas, or weekly priorities\n"
        "- Live activity (e.g., yesterday's WakaTime coding, recent commits)\n"
        "- Time of day (morning intentions, evening reflections, lunch break)\n"
        "- Habits they're trying to build or break\n"
        "- A follow-up on something you discussed earlier (without literally repeating it)\n\n"
        "Style: no greetings, no \"hi\", no \"how are you?\" — lead with substance. "
        "Match their communication style. Don't be saccharine; be a useful copilot.\n\n"
        "Skip only in these specific cases. If skipping, respond with exactly <SKIP> and nothing else:\n"
        "- The very last assistant turn in recent conversation already said the same thing you would say now\n"
        "- The user explicitly asked not to be bothered in the last few turns\n"
        "- Context is so thin (no goals, no activity, no history) that anything you say would be a generic greeting\n"
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
