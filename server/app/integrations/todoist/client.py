from __future__ import annotations

from typing import Any

import httpx

TODOIST_API_BASE = "https://api.todoist.com/api/v1"
PAGE_LIMIT = 200
MAX_PAGES = 10


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


async def _collect(
    token: str,
    path: str,
    *,
    params: dict[str, Any] | None = None,
    label: str = "request",
    timeout: float = 15.0,
) -> list[dict[str, Any]]:
    """Walk the v1 cursor-paginated `{results, next_cursor}` shape into one list."""
    items: list[dict[str, Any]] = []
    cursor: str | None = None
    async with httpx.AsyncClient(timeout=timeout) as http:
        for _ in range(MAX_PAGES):
            page_params: dict[str, Any] = dict(params or {})
            page_params["limit"] = PAGE_LIMIT
            if cursor:
                page_params["cursor"] = cursor
            response = await http.get(
                f"{TODOIST_API_BASE}{path}",
                headers=_headers(token),
                params=page_params,
            )
            _raise_for(response, label)
            payload = response.json()
            if isinstance(payload, list):
                items.extend(payload)
                break
            items.extend(payload.get("results") or [])
            cursor = payload.get("next_cursor")
            if not cursor:
                break
    return items


async def verify_token(token: str, *, timeout: float = 10.0) -> None:
    """Validate a Todoist API token by hitting a cheap authenticated endpoint."""
    async with httpx.AsyncClient(timeout=timeout) as http:
        response = await http.get(
            f"{TODOIST_API_BASE}/projects",
            headers=_headers(token),
            params={"limit": 1},
        )
    _raise_for(response, "verify")


async def fetch_projects(token: str, *, timeout: float = 15.0) -> dict[str, str]:
    """Return a {project_id: project_name} map for labeling tasks."""
    items = await _collect(token, "/projects", label="projects", timeout=timeout)
    return {
        p["id"]: p.get("name", "")
        for p in items
        if isinstance(p, dict) and p.get("id")
    }


async def fetch_tasks(
    token: str,
    *,
    query: str | None = None,
    timeout: float = 15.0,
) -> list[dict[str, Any]]:
    """Return active (incomplete) tasks. With `query`, apply a Todoist filter."""
    if query:
        return await _collect(
            token,
            "/tasks/filter",
            params={"query": query},
            label="tasks",
            timeout=timeout,
        )
    return await _collect(token, "/tasks", label="tasks", timeout=timeout)
