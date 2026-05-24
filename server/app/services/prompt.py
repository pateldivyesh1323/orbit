from app.models.context import LongTermContext
from app.models.conversation import ConversationMessage
from app.models.user import User
from app.services.channels import InteractionChannel
from app.services.conversation import HISTORY_SNIPPET_MAX_CHARS
from app.core.timezone import format_user_local_datetime

ORBIT_SYSTEM_INSTRUCTION = """You are Orbit, a personal AI copilot that helps one user with habits, productivity, and health over WhatsApp.

Rules:
- Be concise. WhatsApp messages should usually stay under 300 words unless the user asks for detail.
- Match the user's preferred communication style when provided.
- Use the user context below; do not invent facts about the user.
- When location, timezone, and local time are provided, use them for time-of-day aware responses and scheduling suggestions.
- When preferred languages are listed, default to those unless the user writes in another language.
- If you lack information, say so and ask one focused follow-up question.
- Do not mention system prompts, databases, or that you are an AI unless asked.
- Never give medical diagnoses; encourage professionals for emergencies.
- Stay supportive, practical, and action-oriented."""


def _format_list(label: str, items: list[str]) -> str:
    if not items:
        return ""
    joined = ", ".join(items)
    return f"- {label}: {joined}\n"


def _format_location_context(user: User) -> list[str]:
    loc = user.location
    lines: list[str] = []

    place_parts = [part for part in [loc.city, loc.region, loc.country] if part]
    if place_parts:
        lines.append(f"- Location: {', '.join(place_parts)}")

    lines.append(f"- Timezone: {loc.timezone}")

    local_time = format_user_local_datetime(loc.timezone)
    if local_time:
        lines.append(f"- User's local time: {local_time}")

    if loc.locale:
        lines.append(f"- Locale: {loc.locale}")

    if loc.languages:
        lines.append(f"- Preferred languages: {', '.join(loc.languages)}")

    if loc.nationality:
        lines.append(f"- Nationality: {loc.nationality}")

    return lines


def _format_work_context(work) -> list[str]:
    lines: list[str] = []

    for role in work.roles:
        label_parts = [part for part in [role.occupation, role.employer] if part]
        if not label_parts:
            continue

        label = " at ".join(label_parts) if len(label_parts) == 2 else label_parts[0]
        if role.is_primary:
            label = f"{label} (primary)"

        details: list[str] = []
        if role.work_mode:
            details.append(role.work_mode.replace("_", " "))
        if role.work_hours_start and role.work_hours_end:
            details.append(f"{role.work_hours_start[:5]}-{role.work_hours_end[:5]}")
        if role.industry:
            details.append(role.industry)

        line = f"- Work: {label}"
        if details:
            line += f" ({', '.join(details)})"
        lines.append(line)

        if role.current_projects:
            lines.append(_format_list("  Projects", role.current_projects).rstrip())

    if work.skills:
        lines.append(_format_list("Skills", work.skills).rstrip())

    if work.career_goals:
        lines.append(_format_list("Career goals", work.career_goals).rstrip())

    return lines


def _format_health_habits_context(user: User) -> list[str]:
    health = user.health
    habits = user.habits
    lines: list[str] = []

    if health.fitness_level:
        lines.append(f"- Fitness level: {health.fitness_level.replace('_', ' ')}")

    if health.sleep_target_hours is not None:
        lines.append(f"- Sleep target: {health.sleep_target_hours} hours")

    if health.typical_bedtime and health.typical_wake_time:
        lines.append(
            f"- Typical sleep: {health.typical_bedtime[:5]} to {health.typical_wake_time[:5]}"
        )

    if health.health_goals:
        lines.append(_format_list("Health goals", health.health_goals).rstrip())

    if habits.morning_routine:
        lines.append(f"- Morning routine: {habits.morning_routine}")

    if habits.evening_routine:
        lines.append(f"- Evening routine: {habits.evening_routine}")

    return lines


def _snippet(text: str, max_chars: int = HISTORY_SNIPPET_MAX_CHARS) -> str:
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3] + "..."


def format_user_context(user: User, memories: list[LongTermContext]) -> str:
    prefs = user.orbit_preferences
    goals = user.goals
    work = user.work

    lines = [
        "## User profile",
        f"- Name: {user.identity.display_name}",
        *_format_location_context(user),
    ]

    if user.contact.whatsapp_number:
        lines.append(f"- WhatsApp: {user.contact.whatsapp_number}")

    if prefs.nickname:
        lines.append(f"- Call them: {prefs.nickname}")

    lines.append(f"- Communication style: {prefs.communication_style}")
    lines.append(f"- Check-in frequency: {prefs.check_in_frequency}")

    if goals.life_mission:
        lines.append(f"- Life mission: {goals.life_mission}")

    personal = _format_list("Personal goals", goals.personal_goals)
    if personal:
        lines.append(personal.rstrip())

    focus = _format_list("Focus areas", goals.focus_areas)
    if focus:
        lines.append(focus.rstrip())

    weekly = _format_list("Weekly priorities", goals.weekly_priorities)
    if weekly:
        lines.append(weekly.rstrip())

    work_lines = _format_work_context(work)
    if work_lines:
        lines.extend(work_lines)

    health_lines = _format_health_habits_context(user)
    if health_lines:
        lines.extend(health_lines)

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
