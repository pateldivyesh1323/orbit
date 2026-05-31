from __future__ import annotations

import logging
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.core.integration_security import decrypt_secret
from app.integrations.github.client import (
    GitHubAuthError,
    GitHubError,
    fetch_open_prs,
    fetch_user_events,
)
from app.models.context import LongTermContext
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)

GITHUB_SOURCE_REF = "github:rolling"
LOOKBACK_DAYS = 7

COMMIT_EVENT = "PushEvent"
PR_OPENED_EVENT = "PullRequestEvent"
ISSUE_EVENT = "IssuesEvent"
REVIEW_EVENT = "PullRequestReviewEvent"


def _event_date(event: dict[str, Any]) -> date | None:
    created = event.get("created_at")
    if not created:
        return None
    try:
        return datetime.fromisoformat(created.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _count_commits_in_event(event: dict[str, Any]) -> int:
    payload = event.get("payload") or {}
    # `commits` is truncated by GitHub for large pushes; trust the metadata first.
    explicit = payload.get("distinct_size") or payload.get("size")
    if explicit:
        return int(explicit)
    in_array = len(payload.get("commits") or [])
    if in_array:
        return in_array
    # Authenticated events feed strips commit info entirely; one push implies
    # at least one commit, which is a better floor than reporting zero.
    return 1


def _compute_streak(commit_days: set[date], today: date) -> int:
    """Walk backwards from today counting consecutive days with activity."""
    streak = 0
    cursor = today
    # If nothing today, also accept yesterday as the streak's last day.
    if cursor not in commit_days:
        cursor = today - timedelta(days=1)
    while cursor in commit_days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


def _summarize_events(
    events: list[dict[str, Any]], today_utc: date
) -> dict[str, Any]:
    yesterday = today_utc - timedelta(days=1)
    week_start = today_utc - timedelta(days=LOOKBACK_DAYS - 1)

    commits_by_day: Counter[date] = Counter()
    repos_by_day: defaultdict[date, Counter[str]] = defaultdict(Counter)
    prs_opened_week = 0
    prs_merged_week = 0
    issues_opened_week = 0
    reviews_week = 0

    for ev in events:
        d = _event_date(ev)
        if d is None:
            continue
        repo_name = (ev.get("repo") or {}).get("name") or "(unknown)"
        if d >= week_start:
            if ev.get("type") == COMMIT_EVENT:
                commit_count = _count_commits_in_event(ev)
                commits_by_day[d] += commit_count
                repos_by_day[d][repo_name] += commit_count
            elif ev.get("type") == PR_OPENED_EVENT:
                action = (ev.get("payload") or {}).get("action")
                if action == "opened":
                    prs_opened_week += 1
                elif action == "closed":
                    pr_payload = (ev.get("payload") or {}).get("pull_request") or {}
                    if pr_payload.get("merged"):
                        prs_merged_week += 1
            elif ev.get("type") == ISSUE_EVENT:
                action = (ev.get("payload") or {}).get("action")
                if action == "opened":
                    issues_opened_week += 1
            elif ev.get("type") == REVIEW_EVENT:
                reviews_week += 1

    yesterday_commits = commits_by_day.get(yesterday, 0)
    yesterday_repos = sorted(
        repos_by_day.get(yesterday, Counter()).items(),
        key=lambda kv: kv[1],
        reverse=True,
    )

    week_commits_total = sum(commits_by_day.values())
    week_repo_totals: Counter[str] = Counter()
    for day_repos in repos_by_day.values():
        week_repo_totals.update(day_repos)
    top_repos_week = week_repo_totals.most_common(5)

    streak = _compute_streak(set(commits_by_day.keys()), today_utc)

    return {
        "yesterday_commits": yesterday_commits,
        "yesterday_repos": [
            {"name": name, "commits": count} for name, count in yesterday_repos[:5]
        ],
        "week_commits": week_commits_total,
        "week_prs_opened": prs_opened_week,
        "week_prs_merged": prs_merged_week,
        "week_issues_opened": issues_opened_week,
        "week_reviews": reviews_week,
        "top_repos_week": [
            {"name": name, "commits": count} for name, count in top_repos_week
        ],
        "streak_days": streak,
    }


def _summarize_open_prs(prs: list[dict[str, Any]], today_utc: date) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for pr in prs:
        url = pr.get("html_url") or ""
        # repository_url is "https://api.github.com/repos/owner/repo"
        repo_url = pr.get("repository_url") or ""
        repo = repo_url.rsplit("/repos/", 1)[-1] if "/repos/" in repo_url else "?"
        created_at = pr.get("created_at")
        age_days = 0
        if created_at:
            try:
                dt = datetime.fromisoformat(created_at.replace("Z", "+00:00")).date()
                age_days = (today_utc - dt).days
            except ValueError:
                pass
        out.append({
            "repo": repo,
            "number": pr.get("number"),
            "title": pr.get("title") or "(no title)",
            "url": url,
            "age_days": age_days,
        })
    return out


def _build_summary_text(stats: dict[str, Any], open_prs: list[dict[str, Any]]) -> str:
    parts: list[str] = []
    if stats["yesterday_commits"]:
        repo_names = [r["name"].split("/")[-1] for r in stats["yesterday_repos"][:2]]
        suffix = f" ({', '.join(repo_names)})" if repo_names else ""
        parts.append(f"Yesterday: {stats['yesterday_commits']} commits{suffix}")
    else:
        parts.append("No commits yesterday")

    parts.append(f"Past 7 days: {stats['week_commits']} commits")
    if open_prs:
        parts.append(f"{len(open_prs)} open PR(s)")
    if stats["streak_days"]:
        parts.append(f"{stats['streak_days']}-day streak")
    return " · ".join(parts)


def _build_content_text(
    stats: dict[str, Any],
    open_prs: list[dict[str, Any]],
    today_utc: date,
) -> str:
    yesterday = (today_utc - timedelta(days=1)).isoformat()
    lines: list[str] = []
    lines.append(f"Yesterday ({yesterday}): {stats['yesterday_commits']} commits")
    if stats["yesterday_repos"]:
        repos = ", ".join(
            f"{r['name'].split('/')[-1]} {r['commits']}" for r in stats["yesterday_repos"]
        )
        lines.append(f"  Repos: {repos}")

    lines.append("")
    lines.append(
        f"Past 7 days: {stats['week_commits']} commits, "
        f"{stats['week_prs_opened']} PRs opened, "
        f"{stats['week_prs_merged']} PRs merged, "
        f"{stats['week_reviews']} reviews"
    )
    if stats["top_repos_week"]:
        repos = ", ".join(
            f"{r['name'].split('/')[-1]} ({r['commits']})"
            for r in stats["top_repos_week"]
        )
        lines.append(f"  Top repos: {repos}")
    if stats["streak_days"]:
        lines.append(f"Current contribution streak: {stats['streak_days']} days")

    if open_prs:
        lines.append("")
        lines.append(f"Open PRs ({len(open_prs)}):")
        for pr in open_prs[:6]:
            age = f"{pr['age_days']}d old" if pr["age_days"] else "today"
            lines.append(f"  {pr['repo']}#{pr['number']} ({age}) — {pr['title']}")

    return "\n".join(lines)


async def sync_github(integration: Integration, user: User) -> LongTermContext:
    """Pull recent GitHub activity and upsert it into the user's LongTermContext."""
    encrypted_pat = integration.credentials.get("api_key")
    if not encrypted_pat:
        raise GitHubError("No GitHub PAT stored on this integration")

    token = decrypt_secret(encrypted_pat)
    username = integration.credentials.get("username")
    if not username:
        raise GitHubError("GitHub username missing on this integration; reconnect")

    try:
        events = await fetch_user_events(token, username)
        open_prs_raw = await fetch_open_prs(token, username)
    except GitHubAuthError:
        raise
    except GitHubError:
        raise

    today_utc = datetime.now(timezone.utc).date()
    stats = _summarize_events(events, today_utc)
    open_prs = _summarize_open_prs(open_prs_raw, today_utc)

    summary_text = _build_summary_text(stats, open_prs)
    content_text = _build_content_text(stats, open_prs, today_utc)

    metadata = {
        "username": username,
        "stats": stats,
        "open_prs": open_prs,
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }

    existing = await LongTermContext.find_one(
        LongTermContext.user.id == user.id,
        LongTermContext.source_ref == GITHUB_SOURCE_REF,
    )

    if existing is None:
        doc = LongTermContext(
            user=user,
            context_type="work",
            title="Recent GitHub activity",
            content=content_text,
            summary=summary_text,
            importance=7,
            source="github",
            source_ref=GITHUB_SOURCE_REF,
            tags=["github", "coding-activity"],
            metadata=metadata,
        )
        await doc.insert()
        logger.info("Created GitHub LongTermContext for user=%s", user.id)
        return doc

    existing.content = content_text
    existing.summary = summary_text
    existing.metadata = metadata
    existing.is_archived = False
    existing.touch_updated()
    await existing.save()
    logger.info("Updated GitHub LongTermContext for user=%s", user.id)
    return existing
