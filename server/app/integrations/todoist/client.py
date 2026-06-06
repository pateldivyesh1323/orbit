from __future__ import annotations

from typing import Any

import httpx

TODOIST_API_BASE = "https://api.todoist.com/rest/v2"


class TodoistError(Exception):
    pass


class TodoistAuthError(TodoistError):
    pass


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _raise_for(response: httpx.Response, label: str) -> None:
    if response.status_code in (401, 403):
        raise TodoistAuthError(
            f"Todoist rejected the request ({response.status_code})"
        )
    if response.status_code >= 400:
        raise TodoistError(
            f"Todoist {label} failed ({response.status_code}): {response.text[:200]}"
        )


async def verify_token(token: str, *, timeout: float = 10.0) -> None:
    """Validate a Todoist API token by hitting a cheap authenticated endpoint."""
    async with httpx.AsyncClient(timeout=timeout) as http:
        response = await http.get(
            f"{TODOIST_API_BASE}/projects", headers=_headers(token)
        )
    _raise_for(response, "verify")


async def fetch_projects(token: str, *, timeout: float = 15.0) -> dict[str, str]:
    """Return a {project_id: project_name} map for labeling tasks."""
    async with httpx.AsyncClient(timeout=timeout) as http:
        response = await http.get(
            f"{TODOIST_API_BASE}/projects", headers=_headers(token)
        )
    _raise_for(response, "projects")
    data = response.json()
    if not isinstance(data, list):
        return {}
    return {p["id"]: p.get("name", "") for p in data if isinstance(p, dict) and p.get("id")}


async def fetch_tasks(
    token: str,
    *,
    query: str | None = None,
    timeout: float = 15.0,
) -> list[dict[str, Any]]:
    """Return active (incomplete) tasks. With `query`, apply a Todoist filter."""
    params: dict[str, str] = {}
    if query:
        params["filter"] = query
    async with httpx.AsyncClient(timeout=timeout) as http:
        response = await http.get(
            f"{TODOIST_API_BASE}/tasks",
            headers=_headers(token),
            params=params or None,
        )
    _raise_for(response, "tasks")
    data = response.json()
    return data if isinstance(data, list) else []
