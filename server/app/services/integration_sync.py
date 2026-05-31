from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.integrations.github.client import GitHubAuthError, GitHubError
from app.integrations.github.sync import sync_github
from app.integrations.google_calendar.client import CalendarAuthError, CalendarError
from app.integrations.google_calendar.sync import (
    GoogleCalendarSyncError,
    sync_google_calendar,
)
from app.integrations.wakatime.client import WakaTimeAuthError, WakaTimeError
from app.integrations.wakatime.sync import sync_wakatime
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)


async def sync_all_integrations() -> dict:
    """Re-sync every active integration across all users. Errors are caught per-integration."""
    integrations = await Integration.find(Integration.status != "inactive").to_list()
    stats = {
        "total": len(integrations),
        "synced": 0,
        "failed": 0,
        "skipped": 0,
        "errors": [],
    }

    for integration in integrations:
        try:
            await integration.fetch_link(Integration.user)
            user: User | None = integration.user  # type: ignore[assignment]
        except Exception:
            logger.exception("Could not load user for integration=%s", integration.id)
            stats["failed"] += 1
            continue

        if user is None:
            stats["skipped"] += 1
            continue

        try:
            if integration.provider == "wakatime":
                context = await sync_wakatime(integration, user)
            elif integration.provider == "google_calendar":
                context = await sync_google_calendar(integration, user)
            elif integration.provider == "github":
                context = await sync_github(integration, user)
            else:
                stats["skipped"] += 1
                continue

            integration.status = "active"
            integration.last_synced_at = datetime.now(timezone.utc)
            integration.last_sync_summary = context.summary
            integration.last_sync_error = None
            integration.touch_updated()
            await integration.save()
            stats["synced"] += 1
        except (
            WakaTimeAuthError,
            WakaTimeError,
            CalendarAuthError,
            CalendarError,
            GoogleCalendarSyncError,
            GitHubAuthError,
            GitHubError,
        ) as exc:
            integration.status = "error"
            integration.last_sync_error = str(exc)
            integration.touch_updated()
            await integration.save()
            stats["failed"] += 1
            stats["errors"].append(
                {"integration_id": str(integration.id), "error": str(exc)}
            )
        except Exception as exc:
            logger.exception("Sync crashed for integration=%s", integration.id)
            integration.status = "error"
            integration.last_sync_error = "Unexpected sync error"
            integration.touch_updated()
            await integration.save()
            stats["failed"] += 1
            stats["errors"].append(
                {"integration_id": str(integration.id), "error": str(exc)[:200]}
            )

    return stats
