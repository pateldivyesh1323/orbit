from __future__ import annotations

import logging
from typing import Any

from google.genai import types

from app.integrations.todoist.client import (
    TodoistAuthError,
    TodoistError,
    fetch_projects,
    fetch_tasks,
)
from app.core.integration_security import decrypt_secret
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)

DEFAULT_FILTER = "(today | overdue)"
HARD_MAX_RESULTS = 30
PRIORITY_LABELS = {4: "p1", 3: "p2", 2: "p3", 1: "p4"}


declaration = types.FunctionDeclaration(
    name="get_tasks",
    description=(
        "Look up the user's Todoist tasks. Use when the user asks about their "
        "to-dos, what's due, what's overdue, or tasks in a project. Accepts a "
        "Todoist filter query. If Todoist is not connected, the tool returns an "
        "error and you should suggest connecting it in Dashboard → Integrations."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "query": types.Schema(
                type=types.Type.STRING,
                description=(
                    "Todoist filter query. Defaults to '(today | overdue)'. "
                    "Examples: 'today', 'overdue', '7 days', 'p1', "
                    "'#Work', 'no date', 'search: invoice'."
                ),
            ),
            "max_results": types.Schema(
                type=types.Type.INTEGER,
                description=f"Max tasks to return. Default 20, max {HARD_MAX_RESULTS}.",
            ),
        },
        required=[],
    ),
)


async def handle(
    *,
    user: User,
    query: str | None = None,
    max_results: int | None = None,
) -> dict[str, Any]:
    integration = await Integration.find_one(
        Integration.user.id == user.id,
        Integration.provider == "todoist",
    )
    if integration is None:
        return {
            "ok": False,
            "error": "not_linked",
            "message": "Todoist is not connected. Tell the user to connect it in Dashboard → Integrations.",
        }
    if integration.status == "error":
        return {
            "ok": False,
            "error": "integration_error",
            "message": (
                f"Todoist integration is in an error state: "
                f"{integration.last_sync_error or 'unknown error'}. "
                "Tell the user to reconnect from the Integrations tab."
            ),
        }

    encrypted_token = integration.credentials.get("api_key")
    if not encrypted_token:
        return {
            "ok": False,
            "error": "auth_failed",
            "message": "Todoist token missing. User should reconnect Todoist.",
        }
    token = decrypt_secret(encrypted_token)

    todoist_filter = (query or "").strip() or DEFAULT_FILTER
    cap = max(1, min(max_results or 20, HARD_MAX_RESULTS))

    try:
        projects = await fetch_projects(token)
        tasks = await fetch_tasks(token, query=todoist_filter)
    except TodoistAuthError:
        return {
            "ok": False,
            "error": "auth_failed",
            "message": "Todoist rejected the token. User should reconnect Todoist.",
        }
    except TodoistError as exc:
        return {"ok": False, "error": "todoist_api_failed", "message": str(exc)}

    out: list[dict[str, Any]] = []
    for task in tasks[:cap]:
        due = task.get("due") if isinstance(task.get("due"), dict) else None
        out.append(
            {
                "content": task.get("content") or "(untitled)",
                "project": projects.get(task.get("project_id", "")),
                "priority": PRIORITY_LABELS.get(task.get("priority", 1)),
                "due": (due or {}).get("date") if due else None,
                "due_string": (due or {}).get("string") if due else None,
                "url": task.get("url"),
            }
        )

    return {
        "ok": True,
        "query": todoist_filter,
        "count": len(out),
        "tasks": out,
    }
