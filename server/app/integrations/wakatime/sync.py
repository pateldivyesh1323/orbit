import logging
from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.core.integration_security import decrypt_secret
from app.integrations.wakatime.client import (
    WakaTimeAuthError,
    WakaTimeError,
    fetch_summaries,
)
from app.models.context import LongTermContext
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)

WAKATIME_SOURCE_REF = "wakatime:rolling"
LOOKBACK_DAYS = 7


def _format_duration(total_seconds: float) -> str:
    seconds = int(total_seconds)
    if seconds < 60:
        return f"{seconds}s"
    hours, remainder = divmod(seconds, 3600)
    minutes = remainder // 60
    if hours:
        return f"{hours}h {minutes}m"
    return f"{minutes}m"


def _top_items(items: list[dict[str, Any]], limit: int = 3) -> list[dict[str, Any]]:
    return sorted(items, key=lambda i: i.get("total_seconds", 0), reverse=True)[:limit]


def _summarize_day(day: dict[str, Any]) -> dict[str, Any]:
    grand = day.get("grand_total", {}) or {}
    total_seconds = float(grand.get("total_seconds") or 0)
    return {
        "date": day.get("range", {}).get("date"),
        "total_seconds": total_seconds,
        "total_human": _format_duration(total_seconds),
        "top_languages": [
            {"name": l["name"], "human": _format_duration(l.get("total_seconds", 0))}
            for l in _top_items(day.get("languages") or [])
        ],
        "top_projects": [
            {"name": p["name"], "human": _format_duration(p.get("total_seconds", 0))}
            for p in _top_items(day.get("projects") or [])
        ],
    }


def _build_summary_text(yesterday: dict[str, Any], week_seconds: float) -> str:
    if yesterday["total_seconds"] == 0:
        return f"No coding logged yesterday. Past 7 days: {_format_duration(week_seconds)} total."

    top_lang = yesterday["top_languages"][0]["name"] if yesterday["top_languages"] else None
    top_proj = yesterday["top_projects"][0]["name"] if yesterday["top_projects"] else None
    tail_parts = [p for p in (top_lang, top_proj) if p]
    tail = f" ({', '.join(tail_parts)})" if tail_parts else ""
    return (
        f"Yesterday: {yesterday['total_human']} coding{tail}. "
        f"Past 7 days: {_format_duration(week_seconds)} total."
    )


def _build_content_text(yesterday: dict[str, Any], days: list[dict[str, Any]], week_seconds: float) -> str:
    lines: list[str] = []
    lines.append(f"Yesterday ({yesterday['date']}): {yesterday['total_human']}")
    if yesterday["top_languages"]:
        langs = ", ".join(f"{l['name']} {l['human']}" for l in yesterday["top_languages"])
        lines.append(f"  Languages: {langs}")
    if yesterday["top_projects"]:
        projs = ", ".join(f"{p['name']} {p['human']}" for p in yesterday["top_projects"])
        lines.append(f"  Projects: {projs}")

    lines.append("")
    lines.append(f"Past 7 days total: {_format_duration(week_seconds)}")
    for day in days[-7:]:
        lines.append(f"  {day['date']}: {day['total_human']}")
    return "\n".join(lines)


async def sync_wakatime(integration: Integration, user: User) -> LongTermContext:
    """Pull recent WakaTime activity and upsert it into the user's LongTermContext."""
    encrypted_key = integration.credentials.get("api_key")
    if not encrypted_key:
        raise WakaTimeError("No WakaTime API key stored on this integration")

    api_key = decrypt_secret(encrypted_key)

    today_utc = datetime.now(timezone.utc).date()
    start = today_utc - timedelta(days=LOOKBACK_DAYS)
    end = today_utc - timedelta(days=1)  # WakaTime "yesterday"

    try:
        payload = await fetch_summaries(api_key, start, end)
    except WakaTimeAuthError:
        raise
    except WakaTimeError:
        raise

    raw_days: list[dict[str, Any]] = payload.get("data") or []
    if not raw_days:
        raise WakaTimeError("WakaTime returned no data for the requested range")

    days = [_summarize_day(d) for d in raw_days]
    yesterday = days[-1]
    week_seconds = sum(d["total_seconds"] for d in days)

    summary_text = _build_summary_text(yesterday, week_seconds)
    content_text = _build_content_text(yesterday, days, week_seconds)

    existing = await LongTermContext.find_one(
        LongTermContext.user.id == user.id,
        LongTermContext.source_ref == WAKATIME_SOURCE_REF,
    )

    metadata = {
        "yesterday": yesterday,
        "days": days,
        "week_total_seconds": week_seconds,
        "week_total_human": _format_duration(week_seconds),
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }

    if existing is None:
        doc = LongTermContext(
            user=user,
            context_type="work",
            title="Recent WakaTime activity",
            content=content_text,
            summary=summary_text,
            importance=7,
            source="wakatime",
            source_ref=WAKATIME_SOURCE_REF,
            tags=["wakatime", "coding-activity"],
            metadata=metadata,
        )
        await doc.insert()
        logger.info("Created WakaTime LongTermContext for user=%s", user.id)
        return doc

    existing.content = content_text
    existing.summary = summary_text
    existing.metadata = metadata
    existing.is_archived = False
    existing.touch_updated()
    await existing.save()
    logger.info("Updated WakaTime LongTermContext for user=%s", user.id)
    return existing
