from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.core.integration_security import decrypt_secret
from app.integrations.todoist.client import (
    TodoistAuthError,
    TodoistError,
    fetch_projects,
    fetch_tasks,
)
from app.models.context import LongTermContext
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)

TODOIST_SOURCE_REF = "todoist:rolling"
UPCOMING_DAYS = 7
PRIORITY_LABELS = {4: "p1", 3: "p2", 2: "p3", 1: "p4"}


def _user_today(user: User) -> date:
    try:
        tz = ZoneInfo(user.location.timezone)
    except ZoneInfoNotFoundError:
        tz = ZoneInfo("UTC")
    return datetime.now(tz).date()


def _due_date(task: dict[str, Any]) -> date | None:
    due = task.get("due")
    if not isinstance(due, dict):
        return None
    raw = due.get("date")
    if not raw:
        return None
    try:
        return date.fromisoformat(raw[:10])
    except ValueError:
        return None


def _task_line(
    task: dict[str, Any], projects: dict[str, str], *, due_label: str | None = None
) -> str:
    priority = PRIORITY_LABELS.get(task.get("priority", 1))
    priority_tag = f"[{priority}] " if priority in ("p1", "p2") else ""
    project = projects.get(task.get("project_id", ""))
    project_tag = f" ({project})" if project else ""
    content = task.get("content") or "(untitled)"
    due_tag = f" — due {due_label}" if due_label else ""
    return f"  • {priority_tag}{content}{project_tag}{due_tag}"


def _build_texts(
    overdue: list[tuple[dict[str, Any], date]],
    today_tasks: list[dict[str, Any]],
    upcoming: list[tuple[dict[str, Any], date]],
    projects: dict[str, str],
    total_active: int,
) -> tuple[str, str]:
    if total_active == 0:
        return "No active tasks in Todoist.", "Todoist is clear — no active tasks."

    summary_bits: list[str] = []
    if today_tasks:
        summary_bits.append(f"{len(today_tasks)} due today")
    if overdue:
        summary_bits.append(f"{len(overdue)} overdue")
    if upcoming:
        summary_bits.append(f"{len(upcoming)} upcoming")
    if not summary_bits:
        summary_bits.append(f"{total_active} active tasks, none scheduled soon")
    summary = " · ".join(summary_bits) + "."

    lines = [f"{total_active} active tasks."]
    if overdue:
        lines.append("")
        lines.append(f"Overdue ({len(overdue)}):")
        for task, due in overdue[:8]:
            lines.append(_task_line(task, projects, due_label=due.isoformat()))
    if today_tasks:
        lines.append("")
        lines.append(f"Due today ({len(today_tasks)}):")
        for task in today_tasks[:10]:
            lines.append(_task_line(task, projects))
    if upcoming:
        lines.append("")
        lines.append(f"Upcoming (next {UPCOMING_DAYS} days):")
        for task, due in upcoming[:8]:
            lines.append(_task_line(task, projects, due_label=due.strftime("%a %b %d")))
    return summary, "\n".join(lines)


async def sync_todoist(integration: Integration, user: User) -> LongTermContext:
    encrypted_token = integration.credentials.get("api_key")
    if not encrypted_token:
        raise TodoistError("No Todoist API token stored on this integration")

    token = decrypt_secret(encrypted_token)

    try:
        projects = await fetch_projects(token)
        tasks = await fetch_tasks(token)
    except TodoistAuthError:
        raise
    except TodoistError:
        raise

    today = _user_today(user)
    horizon = today + timedelta(days=UPCOMING_DAYS)
    overdue: list[tuple[dict[str, Any], date]] = []
    today_tasks: list[dict[str, Any]] = []
    upcoming: list[tuple[dict[str, Any], date]] = []
    for task in tasks:
        due = _due_date(task)
        if due is None:
            continue
        if due < today:
            overdue.append((task, due))
        elif due == today:
            today_tasks.append(task)
        elif due <= horizon:
            upcoming.append((task, due))
    overdue.sort(key=lambda item: item[1])
    upcoming.sort(key=lambda item: item[1])

    summary_text, content_text = _build_texts(
        overdue, today_tasks, upcoming, projects, len(tasks)
    )

    metadata = {
        "active_total": len(tasks),
        "due_today": len(today_tasks),
        "overdue": len(overdue),
        "upcoming": len(upcoming),
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }

    existing = await LongTermContext.find_one(
        LongTermContext.user.id == user.id,
        LongTermContext.source_ref == TODOIST_SOURCE_REF,
    )

    if existing is None:
        doc = LongTermContext(
            user=user,
            context_type="other",
            title="Todoist tasks",
            content=content_text,
            summary=summary_text,
            importance=7,
            source="todoist",
            source_ref=TODOIST_SOURCE_REF,
            tags=["todoist", "tasks"],
            metadata=metadata,
        )
        await doc.insert()
        logger.info("Created Todoist LongTermContext for user=%s", user.id)
        return doc

    existing.content = content_text
    existing.summary = summary_text
    existing.metadata = metadata
    existing.is_archived = False
    existing.touch_updated()
    await existing.save()
    logger.info("Updated Todoist LongTermContext for user=%s", user.id)
    return existing
