from __future__ import annotations

import logging
from typing import Any

from google.genai import types

from app.integrations.gmail.client import (
    GmailAuthError,
    GmailError,
    search_messages,
)
from app.integrations.gmail.sync import GmailSyncError, _ensure_access_token
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)

DEFAULT_QUERY = "is:unread in:inbox"
DEFAULT_MAX_RESULTS = 10
HARD_MAX_RESULTS = 25


declaration = types.FunctionDeclaration(
    name="get_emails",
    description=(
        "Search the user's Gmail inbox and return matching messages (sender, "
        "subject, snippet, date). Use when the user asks about their email, "
        "unread messages, follow-ups they owe, or mail from a specific person. "
        "Accepts a Gmail search query. Read-only metadata only — message bodies "
        "are never read. If Gmail is not connected, the tool returns an error "
        "and you should suggest connecting it in Dashboard → Integrations."
    ),
    parameters=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "query": types.Schema(
                type=types.Type.STRING,
                description=(
                    "Gmail search query. Defaults to unread inbox. Examples: "
                    "'is:unread in:inbox', 'from:alice@example.com', "
                    "'is:important newer_than:3d', 'subject:invoice', "
                    "'has:attachment', 'in:sent newer_than:7d'."
                ),
            ),
            "max_results": types.Schema(
                type=types.Type.INTEGER,
                description=f"Max messages to return. Default {DEFAULT_MAX_RESULTS}, max {HARD_MAX_RESULTS}.",
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
        Integration.provider == "gmail",
    )
    if integration is None:
        return {
            "ok": False,
            "error": "not_linked",
            "message": "Gmail is not connected. Tell the user to connect it in Dashboard → Integrations.",
        }
    if integration.status == "error":
        return {
            "ok": False,
            "error": "integration_error",
            "message": (
                f"Gmail integration is in an error state: "
                f"{integration.last_sync_error or 'unknown error'}. "
                "Tell the user to reconnect from the Integrations tab."
            ),
        }

    q = (query or "").strip() or DEFAULT_QUERY
    cap = max(1, min(max_results or DEFAULT_MAX_RESULTS, HARD_MAX_RESULTS))

    try:
        access_token = await _ensure_access_token(integration)
    except (GmailSyncError, Exception) as exc:
        logger.warning("Gmail token refresh failed for user=%s: %s", user.id, exc)
        return {
            "ok": False,
            "error": "auth_failed",
            "message": "Could not refresh Gmail access. User may need to reconnect.",
        }

    try:
        total, messages = await search_messages(
            access_token, query=q, max_results=cap
        )
    except GmailAuthError:
        return {
            "ok": False,
            "error": "auth_failed",
            "message": "Google rejected the Gmail token. User should reconnect Gmail.",
        }
    except GmailError as exc:
        return {"ok": False, "error": "gmail_api_failed", "message": str(exc)}

    return {
        "ok": True,
        "query": q,
        "estimated_total": total,
        "count": len(messages),
        "emails": messages,
    }
