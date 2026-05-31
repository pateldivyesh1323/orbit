from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from google.genai import types

from app.core.integration_security import decrypt_secret
from app.integrations.github.client import (
    GitHubAuthError,
    GitHubError,
    fetch_user_events,
)
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)

DEFAULT_DAYS_BACK = 7
MAX_DAYS_BACK = 30
DEFAULT_LIMIT = 30
HARD_LIMIT = 100

EVENT_TYPE_ALIAS = {
    "commits": "PushEvent",
    "push": "PushEvent",
    "pushevent": "PushEvent",
    "prs": "PullRequestEvent",
    "pull_requests": "PullRequestEvent",
    "pullrequest": "PullRequestEvent",
    "pullrequestevent": "PullRequestEvent",
    "issues": "IssuesEvent",
    "issueevent": "IssuesEvent",
    "issuesevent": "IssuesEvent",
    "reviews": "PullRequestReviewEvent",
    "review": "PullRequestReviewEvent",
    "pullrequestreviewevent": "PullRequestReviewEvent",
    "stars": "WatchEvent",
    "watch": "WatchEvent",
    "watchevent": "WatchEvent",
    "create": "CreateEvent",
    "createevent": "CreateEvent",
}


declaration = types.FunctionDeclaration(
    name="get_github_activity",
    description=(
        "Fetch the user's recent GitHub activity events (commits, PR opens/merges, "
        "issues, reviews). Use when the user asks about what they've worked on, "
        "what they shipped, recent commits in a repo, or anything that requires "
        "fresher / more specific GitHub data than the rolling summary already in "
        "context. The events endpoint returns PUBLIC events only — if the user "
        "is asking about private repos, mention that limitation. If GitHub is "
        "not connected, the tool returns an error and you should suggest "
        "connecting it in Dashboard → Integrations."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "days_back": types.Schema(
                type=types.Type.INTEGER,
                description=(
                    f"Look back this many days from today. Default {DEFAULT_DAYS_BACK}, max {MAX_DAYS_BACK}. "
                    "Events older than ~90 days simply won't be returned by GitHub."
                ),
            ),
            "event_types": types.Schema(
                type=types.Type.ARRAY,
                items=types.Schema(type=types.Type.STRING),
                description=(
                    "Optional filter. Accepts GitHub event types like 'PushEvent', "
                    "'PullRequestEvent', 'IssuesEvent', 'PullRequestReviewEvent', "
                    "'CreateEvent', 'WatchEvent', or convenience aliases: "
                    "'commits', 'prs', 'issues', 'reviews', 'stars'. Omit to return all types."
                ),
            ),
            "repo": types.Schema(
                type=types.Type.STRING,
                description=(
                    "Optional repo filter — accepts 'name' (matches owner/name suffix) "
                    "or full 'owner/name'."
                ),
            ),
            "limit": types.Schema(
                type=types.Type.INTEGER,
                description=f"Max events returned. Default {DEFAULT_LIMIT}, max {HARD_LIMIT}.",
            ),
        },
        required=[],
    ),
)


def _normalize_event_types(raw: list[str] | None) -> set[str] | None:
    if not raw:
        return None
    out: set[str] = set()
    for item in raw:
        key = (item or "").strip().lower()
        if not key:
            continue
        if key in EVENT_TYPE_ALIAS:
            out.add(EVENT_TYPE_ALIAS[key])
        elif item[0].isupper() and item.endswith("Event"):
            out.add(item)
        else:
            out.add(item)
    return out or None


def _summarize_event(ev: dict[str, Any]) -> dict[str, Any] | None:
    ev_type = ev.get("type")
    created = ev.get("created_at")
    repo = (ev.get("repo") or {}).get("name") or "(unknown)"
    payload = ev.get("payload") or {}

    summary = ev_type or "Event"

    if ev_type == "PushEvent":
        commits = payload.get("commits") or []
        # GitHub's authenticated events feed strips `commits`/`size`/`distinct_size`
        # from the payload. Use what we have and degrade gracefully.
        n = payload.get("distinct_size") or payload.get("size") or len(commits)
        branch = (payload.get("ref") or "").split("/")[-1]
        head_sha = (payload.get("head") or "")[:7]
        first_msg = (commits[0].get("message") or "").split("\n", 1)[0][:80] if commits else ""
        if n:
            suffix = f" — {first_msg}" if first_msg else ""
            summary = f"{n} commit(s) to {branch}{suffix}" if branch else f"{n} commit(s){suffix}"
        else:
            sha_suffix = f" (head {head_sha})" if head_sha else ""
            summary = f"push to {branch}{sha_suffix}" if branch else f"push{sha_suffix}"
    elif ev_type == "PullRequestEvent":
        action = payload.get("action") or "updated"
        pr = payload.get("pull_request") or {}
        n = pr.get("number")
        title = (pr.get("title") or "").strip()
        merged = pr.get("merged")
        verb = action
        if action == "closed" and merged:
            verb = "merged"
        summary = f"{verb} PR #{n}: {title}" if n else f"{verb} PR: {title}"
    elif ev_type == "PullRequestReviewEvent":
        action = payload.get("action") or "submitted"
        pr = payload.get("pull_request") or {}
        n = pr.get("number")
        state = ((payload.get("review") or {}).get("state") or "").lower()
        summary = f"{action} review ({state}) on PR #{n}" if n else f"{action} review ({state})"
    elif ev_type == "IssuesEvent":
        action = payload.get("action") or "updated"
        issue = payload.get("issue") or {}
        n = issue.get("number")
        title = (issue.get("title") or "").strip()
        summary = f"{action} issue #{n}: {title}" if n else f"{action} issue: {title}"
    elif ev_type == "CreateEvent":
        ref_type = payload.get("ref_type") or "ref"
        ref = payload.get("ref") or ""
        summary = f"created {ref_type}{f' {ref}' if ref else ''}"
    elif ev_type == "WatchEvent":
        summary = "starred"

    return {
        "date": created.split("T")[0] if created else None,
        "type": ev_type,
        "repo": repo,
        "summary": summary,
    }


async def handle(
    *,
    user: User,
    days_back: int | None = None,
    event_types: list[str] | None = None,
    repo: str | None = None,
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

    days = max(1, min(days_back or DEFAULT_DAYS_BACK, MAX_DAYS_BACK))
    cap = max(1, min(limit or DEFAULT_LIMIT, HARD_LIMIT))
    type_filter = _normalize_event_types(event_types)
    repo_filter = (repo or "").strip().lower() or None

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    try:
        token = decrypt_secret(encrypted_pat)
        events = await fetch_user_events(token, username)
    except GitHubAuthError as exc:
        return {"ok": False, "error": "auth_failed", "message": str(exc)}
    except GitHubError as exc:
        return {"ok": False, "error": "github_api_failed", "message": str(exc)}

    out: list[dict[str, Any]] = []
    for ev in events:
        created = ev.get("created_at")
        if not created:
            continue
        try:
            ev_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
        except ValueError:
            continue
        if ev_dt < cutoff:
            break  # events are reverse-chronological; safe to stop
        if type_filter and ev.get("type") not in type_filter:
            continue
        repo_name = ((ev.get("repo") or {}).get("name") or "").lower()
        if repo_filter:
            if "/" in repo_filter:
                if repo_name != repo_filter:
                    continue
            else:
                if not repo_name.endswith(f"/{repo_filter}"):
                    continue
        formatted = _summarize_event(ev)
        if formatted is not None:
            out.append(formatted)
        if len(out) >= cap:
            break

    return {
        "ok": True,
        "username": username,
        "range": {"days_back": days, "since": cutoff.date().isoformat()},
        "note": "public events only — private-repo activity is NOT included",
        "count": len(out),
        "events": out,
    }
