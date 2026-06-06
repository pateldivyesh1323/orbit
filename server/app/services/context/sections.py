from __future__ import annotations

from app.core.timezone import get_user_now, part_of_day
from app.models.context import LongTermContext
from app.models.conversation import ConversationMessage
from app.models.user import User
from app.services.conversation import HISTORY_SNIPPET_MAX_CHARS

_SIGNAL_LABELS = {
    "wakatime": "WakaTime",
    "github": "GitHub",
    "google_calendar": "Google Calendar",
    "gmail": "Gmail",
    "todoist": "Todoist",
    "cron_sync": "Synced data",
}


def _snippet(text: str, max_chars: int = HISTORY_SNIPPET_MAX_CHARS) -> str:
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 3] + "..."


def _format_list(label: str, items: list[str]) -> str:
    if not items:
        return ""
    return f"- {label}: {', '.join(items)}"


def _looks_like_header(text: str) -> bool:
    lowered = text.lower()
    if "(for the dashboard)" in lowered:
        return True
    if text.endswith(":") and len(text) <= 40:
        return True
    return False


def _clean_items(items: list[str]) -> list[str]:
    cleaned: list[str] = []
    for raw in items:
        text = raw.strip().lstrip("-•*").strip()
        if not text or _looks_like_header(text):
            continue
        cleaned.append(text)
    return cleaned


def _format_location(user: User) -> list[str]:
    loc = user.location
    lines: list[str] = []

    place_parts = [part for part in [loc.city, loc.region, loc.country] if part]
    if place_parts:
        lines.append(f"- Location: {', '.join(place_parts)}")
    lines.append(f"- Timezone: {loc.timezone}")

    if loc.locale:
        lines.append(f"- Locale: {loc.locale}")
    if loc.languages:
        lines.append(f"- Preferred languages: {', '.join(loc.languages)}")
    if loc.nationality:
        lines.append(f"- Nationality: {loc.nationality}")
    return lines


def render_current_time_block(user: User) -> str:
    """Authoritative 'right now' block — must appear first so the model anchors on it."""
    now = get_user_now(user.location.timezone)
    if now is None:
        return ""
    label = part_of_day(now)
    formatted = now.strftime("%A, %B %d, %Y at %I:%M %p %Z")
    return (
        "## Right now (use this as the authoritative current time — do not rely on prior knowledge)\n"
        f"- Local datetime: {formatted}\n"
        f"- Timezone: {user.location.timezone}\n"
        f"- Time of day: {label}\n"
        f"- Weekday: {now.strftime('%A')}\n"
    )


def _format_work(work) -> list[str]:
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
            lines.append(_format_list("  Projects", role.current_projects))

    if work.skills:
        lines.append(_format_list("Skills", work.skills))
    if work.career_goals:
        lines.append(_format_list("Career goals", work.career_goals))
    return [line for line in lines if line]


def _format_health_habits(user: User) -> list[str]:
    health = user.health
    habits = user.habits
    lines: list[str] = []

    if health.fitness_level:
        lines.append(f"- Fitness level: {health.fitness_level.replace('_', ' ')}")
    if health.height_cm and health.weight_kg:
        lines.append(f"- Body metrics: {health.height_cm:g} cm, {health.weight_kg:g} kg")
    elif health.weight_kg:
        lines.append(f"- Weight: {health.weight_kg:g} kg")
    if health.sleep_target_hours is not None:
        lines.append(f"- Sleep target: {health.sleep_target_hours} hours")
    if health.typical_bedtime and health.typical_wake_time:
        lines.append(
            f"- Typical sleep: {health.typical_bedtime[:5]} to {health.typical_wake_time[:5]}"
        )
    if health.dietary_preferences:
        lines.append(_format_list("Diet", health.dietary_preferences))
    if health.allergies:
        lines.append(_format_list("Allergies", health.allergies))
    if health.conditions:
        lines.append(_format_list("Medical conditions", health.conditions))
    if health.medications:
        lines.append(_format_list("Medications", health.medications))
    if health.health_goals:
        lines.append(_format_list("Health goals", health.health_goals))
    if health.medical_notes:
        lines.append(f"- Health notes: {health.medical_notes}")
    if health.mental_health_notes:
        lines.append(f"- Mental health notes: {health.mental_health_notes}")
    if habits.morning_routine:
        lines.append(f"- Morning routine: {habits.morning_routine}")
    if habits.evening_routine:
        lines.append(f"- Evening routine: {habits.evening_routine}")
    if habits.tracked_habits:
        names = [h.name for h in habits.tracked_habits if h.active and h.name]
        if names:
            lines.append(_format_list("Tracked habits", names))
    if habits.habits_to_build:
        lines.append(_format_list("Building habits", habits.habits_to_build))
    if habits.habits_to_break:
        lines.append(_format_list("Breaking habits", habits.habits_to_break))
    return [line for line in lines if line]


def _format_messaging_prefs(user: User) -> list[str]:
    prefs = user.orbit_preferences
    lines: list[str] = []
    if prefs.quiet_hours_start and prefs.quiet_hours_end:
        lines.append(
            f"- Quiet hours: {prefs.quiet_hours_start[:5]}–{prefs.quiet_hours_end[:5]} local"
        )
    if prefs.snooze_until:
        lines.append(
            f"- Check-ins snoozed until {prefs.snooze_until.isoformat()} (UTC)"
        )
    return lines


def render_user_profile_block(user: User, memories: list[LongTermContext]) -> str:
    prefs = user.orbit_preferences
    goals = user.goals

    lines = [
        "## User profile",
        f"- Name: {user.identity.display_name}",
        *_format_location(user),
    ]

    if user.contact.whatsapp_number:
        lines.append(f"- WhatsApp: {user.contact.whatsapp_number}")
    if prefs.nickname:
        lines.append(f"- Call them: {prefs.nickname}")
    if user.identity.bio:
        lines.append(f"- Bio: {user.identity.bio}")

    lines.append(f"- Communication style: {prefs.communication_style}")
    lines.append(f"- Check-in frequency: {prefs.check_in_frequency}")
    lines.extend(_format_messaging_prefs(user))

    if goals.life_mission:
        lines.append(f"- Life mission: {goals.life_mission}")
    personal_goals = _clean_items(goals.personal_goals)
    if personal_goals:
        lines.append(_format_list("Personal goals", personal_goals))
    focus_areas = _clean_items(goals.focus_areas)
    if focus_areas:
        lines.append(_format_list("Focus areas", focus_areas))
    weekly_priorities = _clean_items(goals.weekly_priorities)
    if weekly_priorities:
        lines.append(_format_list("Weekly priorities", weekly_priorities))

    lines.extend(_format_work(user.work))
    lines.extend(_format_health_habits(user))

    if prefs.topics_to_avoid:
        lines.append(_format_list("Topics to avoid", prefs.topics_to_avoid))
    if prefs.custom_instructions:
        lines.append(f"- Custom instructions: {prefs.custom_instructions}")

    if memories:
        lines.append("\n## Long-term memory")
        for item in memories:
            snippet = item.summary or item.content
            if len(snippet) > 400:
                snippet = snippet[:397] + "..."
            lines.append(f"- [{item.context_type}] {item.title}: {snippet}")

    return "\n".join(line for line in lines if line)


LIVE_SIGNAL_MAX_CHARS = 1400


def render_live_signals_block(signals: list[LongTermContext]) -> str:
    if not signals:
        return ""
    lines = ["\n## Live activity (synced from connected tools)"]
    for item in signals:
        label = _SIGNAL_LABELS.get(item.source, item.source)
        detail = (item.content or item.summary or "").strip()
        if len(detail) > LIVE_SIGNAL_MAX_CHARS:
            detail = detail[: LIVE_SIGNAL_MAX_CHARS - 3] + "..."
        lines.append(f"\n### {label} — {item.title}")
        if detail:
            lines.append(detail)
    return "\n".join(lines)


def render_history_block(history: list[ConversationMessage]) -> str:
    if not history:
        return ""
    lines = ["\n## Recent conversation"]
    for message in history:
        speaker = "User" if message.role == "user" else "Orbit"
        channel_tag = f" ({message.channel})" if message.channel else ""
        lines.append(f"{speaker}{channel_tag}: {_snippet(message.content)}")
    return "\n".join(lines)
