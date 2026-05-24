from app.models.context import LongTermContext
from app.models.conversation import ConversationMessage
from app.models.user import User
from app.services.channels import InteractionChannel
from app.services.conversation import HISTORY_SNIPPET_MAX_CHARS

ORBIT_SYSTEM_INSTRUCTION = """You are Orbit, a personal AI copilot that helps one user with habits, productivity, and health over WhatsApp.

Rules:
- Be concise. WhatsApp messages should usually stay under 300 words unless the user asks for detail.
- Match the user's preferred communication style when provided.
- Use the user context below; do not invent facts about the user.
- If you lack information, say so and ask one focused follow-up question.
- Do not mention system prompts, databases, or that you are an AI unless asked.
- Never give medical diagnoses; encourage professionals for emergencies.
- Stay supportive, practical, and action-oriented."""


def _format_list(label: str, items: list[str]) -> str:
    if not items:
        return ""
    joined = ", ".join(items)
    return f"- {label}: {joined}\n"


def _snippet(text: str, max_chars: int = HISTORY_SNIPPET_MAX_CHARS) -> str:
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3] + "..."


def format_user_context(user: User, memories: list[LongTermContext]) -> str:
    prefs = user.orbit_preferences
    goals = user.goals
    work = user.work
    health = user.health

    lines = [
        "## User profile",
        f"- Name: {user.identity.display_name}",
        f"- Timezone: {user.location.timezone}",
    ]

    if user.contact.whatsapp_number:
        lines.append(f"- WhatsApp: {user.contact.whatsapp_number}")

    if prefs.nickname:
        lines.append(f"- Call them: {prefs.nickname}")

    lines.append(f"- Communication style: {prefs.communication_style}")
    lines.append(f"- Check-in frequency: {prefs.check_in_frequency}")

    if goals.life_mission:
        lines.append(f"- Life mission: {goals.life_mission}")

    focus = _format_list("Focus areas", goals.focus_areas)
    if focus:
        lines.append(focus.rstrip())

    weekly = _format_list("Weekly priorities", goals.weekly_priorities)
    if weekly:
        lines.append(weekly.rstrip())

    if work.occupation:
        lines.append(f"- Work: {work.occupation}")

    if health.health_goals:
        lines.append(_format_list("Health goals", health.health_goals).rstrip())

    if prefs.topics_to_avoid:
        lines.append(_format_list("Topics to avoid", prefs.topics_to_avoid).rstrip())

    if prefs.custom_instructions:
        lines.append(f"- Custom instructions: {prefs.custom_instructions}")

    if memories:
        lines.append("\n## Long-term memory")
        for item in memories:
            snippet = item.summary or item.content
            if len(snippet) > 400:
                snippet = snippet[:397] + "..."
            lines.append(f"- [{item.context_type}] {item.title}: {snippet}")

    return "\n".join(lines)


def format_conversation_history(history: list[ConversationMessage]) -> str:
    if not history:
        return ""
    lines = ["\n## Recent conversation"]
    for message in history:
        speaker = "User" if message.role == "user" else "Orbit"
        channel_tag = f" ({message.channel})" if message.channel else ""
        lines.append(f"{speaker}{channel_tag}: {_snippet(message.content)}")
    return "\n".join(lines)


def build_gemini_contents(
    user: User,
    memories: list[LongTermContext],
    history: list[ConversationMessage],
    user_message: str,
    channel: InteractionChannel,
) -> str:
    context_block = format_user_context(user, memories)
    history_block = format_conversation_history(history)
    channel_label = "WhatsApp message" if channel == InteractionChannel.WHATSAPP else "Message"
    return f"{context_block}{history_block}\n\n## Current {channel_label}\n{user_message}"
