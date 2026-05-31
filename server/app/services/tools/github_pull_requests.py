from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from google.genai import types

from app.core.integration_security import decrypt_secret
from app.integrations.github.client import (
    GitHubAuthError,
    GitHubError,
    fetch_user_pull_requests,
)
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)

VALID_STATES = ("open", "closed", "all")
VALID_ROLES = ("author", "review_requested", "assignee")
DEFAULT_LIMIT = 10
HARD_LIMIT = 50


declaration = types.FunctionDeclaration(
    name="get_github_pull_requests",
    description=(
        "Search the user's GitHub pull requests with role and state filters. "
        "Use when the user asks: what PRs are open for me, what's waiting on my "
        "review, what did I merge this week, what's assigned to me, etc. "
        "If GitHub is not connected, the tool returns an error and you should "
        "suggest connecting it in Dashboard → Integrations."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "role": types.Schema(
                type=types.Type.STRING,
                description=(
                    "How the user is related to the PR. "
                    "'author' = PRs they opened. "
                    "'review_requested' = PRs waiting on their review. "
                    "'assignee' = PRs assigned to them. "
                    "Default 'author'."
                ),
            ),
            "state": types.Schema(
                type=types.Type.STRING,
                description="One of 'open', 'closed', 'all'. Default 'open'.",
            ),
            "limit": types.Schema(
                type=types.Type.INTEGER,
                description=f"Max PRs to return. Default {DEFAULT_LIMIT}, max {HARD_LIMIT}.",
            ),
        },
        required=[],
    ),
)


def _format_pr(pr: dict[str, Any], today_utc: datetime) -> dict[str, Any]:
    repo_url = pr.get("repository_url") or ""
    repo = repo_url.rsplit("/repos/", 1)[-1] if "/repos/" in repo_url else "?"
    created_at = pr.get("created_at")
    updated_at = pr.get("updated_at")
    age_days = 0
    if created_at:
        try:
            dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            age_days = (today_utc - dt).days
        except ValueError:
            pass

    return {
        "repo": repo,
        "number": pr.get("number"),
        "title": pr.get("title") or "(no title)",
        "state": pr.get("state") or "?",
        "is_draft": bool(pr.get("draft")),
        "age_days": age_days,
        "updated_at": updated_at,
        "url": pr.get("html_url") or "",
        "comments": pr.get("comments", 0),
    }


async def handle(
    *,
    user: User,
    role: str | None = None,
    state: str | None = None,
    limit: int | None = None,
) -> dict[str, Any]:
    integration = await Integration.find_one(
        Integration.user.id == user.id,
        Integration.provider == "github",
    )
    if integration is None:
        return {
            "ok": False,
            "error": "not_linked",
            "message": "GitHub is not connected. Tell the user to connect it in Dashboard → Integrations.",
        }
    if integration.status == "error":
        return {
            "ok": False,
            "error": "integration_error",
            "message": (
                f"GitHub integration is in an error state: "
                f"{integration.last_sync_error or 'unknown error'}. "
                "Tell the user to reconnect from the Integrations tab."
            ),
        }

    encrypted_pat = integration.credentials.get("api_key")
    username = integration.credentials.get("username")
    if not encrypted_pat or not username:
        return {
            "ok": False,
            "error": "missing_credentials",
            "message": "GitHub credentials are incomplete. Tell the user to reconnect.",
        }

    chosen_role = (role or "author").strip().lower()
    if chosen_role not in VALID_ROLES:
        return {
            "ok": False,
            "error": "invalid_role",
            "message": f"role must be one of {VALID_ROLES}",
        }
    chosen_state = (state or "open").strip().lower()
    if chosen_state not in VALID_STATES:
        return {
            "ok": False,
            "error": "invalid_state",
            "message": f"state must be one of {VALID_STATES}",
        }
    cap = max(1, min(limit or DEFAULT_LIMIT, HARD_LIMIT))

    try:
        token = decrypt_secret(encrypted_pat)
        raw_prs = await fetch_user_pull_requests(
            token, username, state=chosen_state, role=chosen_role, per_page=cap
        )
    except GitHubAuthError as exc:
        return {"ok": False, "error": "auth_failed", "message": str(exc)}
    except GitHubError as exc:
        return {"ok": False, "error": "github_api_failed", "message": str(exc)}

    today = datetime.now(timezone.utc)
    prs = [_format_pr(p, today) for p in raw_prs]

    return {
        "ok": True,
        "username": username,
        "role": chosen_role,
        "state": chosen_state,
        "count": len(prs),
        "pull_requests": prs,
    }
