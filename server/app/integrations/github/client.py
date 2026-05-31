from __future__ import annotations

import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)

GITHUB_API_BASE = "https://api.github.com"
USER_AGENT = "Orbit/1.0 (+https://github.com)"
ACCEPT_HEADER = "application/vnd.github+json"
API_VERSION = "2022-11-28"


class GitHubError(Exception):
    pass


class GitHubAuthError(GitHubError):
    pass


def _headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": ACCEPT_HEADER,
        "X-GitHub-Api-Version": API_VERSION,
        "User-Agent": USER_AGENT,
    }


def _raise_for_response(response: httpx.Response, label: str) -> None:
    if response.status_code in (401, 403):
        raise GitHubAuthError(
            f"GitHub rejected the request ({response.status_code}) for {label}"
        )
    if response.status_code >= 400:
        raise GitHubError(
            f"GitHub {label} failed ({response.status_code}): {response.text[:200]}"
        )


async def verify_pat(token: str) -> dict[str, Any]:
    """Validate a PAT and return the authenticated user's profile."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{GITHUB_API_BASE}/user", headers=_headers(token)
        )
    _raise_for_response(response, "verify")
    return response.json()


async def fetch_user_events(
    token: str, username: str, *, per_page: int = 100
) -> list[dict[str, Any]]:
    """Public events for the user. Returns up to 100 most-recent events."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{GITHUB_API_BASE}/users/{username}/events",
            headers=_headers(token),
            params={"per_page": per_page},
        )
    _raise_for_response(response, "user events")
    payload = response.json()
    if not isinstance(payload, list):
        raise GitHubError("Unexpected events payload shape")
    return payload


async def fetch_open_prs(
    token: str, username: str, *, per_page: int = 20
) -> list[dict[str, Any]]:
    """All open PRs authored by the user (across public + private with proper scope)."""
    return await fetch_user_pull_requests(
        token, username, state="open", role="author", per_page=per_page
    )


async def fetch_user_pull_requests(
    token: str,
    username: str,
    *,
    state: str = "open",
    role: str = "author",
    per_page: int = 20,
) -> list[dict[str, Any]]:
    """Generalized PR search.

    `state` is one of: open, closed, all.
    `role` is one of: author, review_requested, assignee.
    """
    role_qualifier = {
        "author": f"author:{username}",
        "review_requested": f"review-requested:{username}",
        "assignee": f"assignee:{username}",
    }.get(role, f"author:{username}")

    state_qualifier = ""
    if state == "open":
        state_qualifier = " is:open"
    elif state == "closed":
        state_qualifier = " is:closed"

    query = f"is:pr {role_qualifier}{state_qualifier}"

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(
            f"{GITHUB_API_BASE}/search/issues",
            headers=_headers(token),
            params={
                "q": query,
                "per_page": per_page,
                "sort": "updated",
                "order": "desc",
            },
        )
    _raise_for_response(response, f"PR search ({role}/{state})")
    payload = response.json()
    return payload.get("items", []) if isinstance(payload, dict) else []
