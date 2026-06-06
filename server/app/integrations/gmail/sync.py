from __future__ import annotations

import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from app.core.integration_security import decrypt_secret, encrypt_secret
from app.integrations.gmail.client import (
    GmailAuthError,
    GmailError,
    count_messages,
    search_messages,
)
from app.integrations.google_calendar.oauth import (
    OAuthExchangeError,
    refresh_access_token,
)
from app.models.context import LongTermContext
from app.models.integration import Integration
from app.models.user import User

logger = logging.getLogger(__name__)

GMAIL_SOURCE_REF = "gmail:rolling"
TOKEN_REFRESH_BUFFER = timedelta(minutes=2)
MAX_PRIMARY = 12
MAX_IMPORTANT = 8


class GmailSyncError(Exception):
    pass


async def _ensure_access_token(integration: Integration) -> str:
    """Return a valid access token, refreshing via the stored refresh token if expired."""
    creds = integration.credentials
    encrypted_access = creds.get("access_token")
    encrypted_refresh = creds.get("refresh_token")
    expires_iso = creds.get("expires_at")

    if not encrypted_refresh:
        raise GmailSyncError("Missing refresh token; reconnect Gmail")

    now = datetime.now(timezone.utc)
    expires_at = None
    if expires_iso:
        try:
            expires_at = datetime.fromisoformat(expires_iso)
        except ValueError:
            expires_at = None

    if encrypted_access and expires_at and expires_at - now > TOKEN_REFRESH_BUFFER:
        return decrypt_secret(encrypted_access)

    refresh_token = decrypt_secret(encrypted_refresh)
    payload = await refresh_access_token(refresh_token)
    access_token = payload["access_token"]
    expires_in = int(payload.get("expires_in", 3600))
    new_expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    integration.credentials["access_token"] = encrypt_secret(access_token)
    integration.credentials["expires_at"] = new_expires_at.isoformat()
    integration.touch_updated()
    await integration.save()
    return access_token


def _short_sender(raw: str) -> str:
    """'Jane Doe <jane@x.com>' -> 'Jane Doe'; bare address -> the address."""
    match = re.match(r"\s*([^<]+?)\s*<", raw)
    if match:
        return match.group(1).strip().strip('"')
    return raw.strip()


def _message_key(message: dict[str, Any]) -> tuple[str, str]:
    return (_short_sender(message["from"]).lower(), (message["subject"] or "").lower())


def _format_messages(messages: list[dict[str, Any]]) -> list[str]:
    return [f"  • {_short_sender(m['from'])} — {m['subject']}" for m in messages]


def _build_texts(
    total_unread: int,
    primary_total: int,
    primary_msgs: list[dict[str, Any]],
    important_total: int,
    important_msgs: list[dict[str, Any]],
) -> tuple[str, str]:
    if total_unread == 0:
        return "Inbox is clear — no unread email.", "No unread messages in the inbox."

    important_keys = {_message_key(m) for m in important_msgs}
    primary_only = [m for m in primary_msgs if _message_key(m) not in important_keys]

    summary_bits = [f"{total_unread} unread in inbox"]
    if primary_total:
        summary_bits.append(f"{primary_total} in Primary")
    if important_total:
        summary_bits.append(f"{important_total} important")
    summary = " · ".join(summary_bits) + "."
    headline = important_msgs[0] if important_msgs else (primary_only[0] if primary_only else None)
    if headline:
        summary += (
            f" Top: \"{headline['subject']}\" from {_short_sender(headline['from'])}."
        )

    lines = [" · ".join(summary_bits)]
    if important_msgs:
        lines.append("")
        lines.append(f"Important unread ({important_total}):")
        lines.extend(_format_messages(important_msgs))
    if primary_only:
        lines.append("")
        lines.append(f"Primary unread ({primary_total}):")
        lines.extend(_format_messages(primary_only))
    if not important_msgs and not primary_only:
        lines.append(
            "Unread mail is all promotions/updates/social — nothing in Primary or marked important."
        )
    return summary, "\n".join(lines)


async def sync_gmail(integration: Integration, user: User) -> LongTermContext:
    try:
        access_token = await _ensure_access_token(integration)
    except OAuthExchangeError as exc:
        raise GmailSyncError(f"Could not refresh Google token: {exc}") from exc

    try:
        total_unread = await count_messages(
            access_token, query="is:unread in:inbox"
        )
        primary_total, primary_msgs = await search_messages(
            access_token,
            query="is:unread in:inbox category:primary",
            max_results=MAX_PRIMARY,
        )
        important_total, important_msgs = await search_messages(
            access_token,
            query="is:unread is:important in:inbox",
            max_results=MAX_IMPORTANT,
        )
    except GmailAuthError:
        integration.credentials.pop("access_token", None)
        integration.credentials.pop("expires_at", None)
        integration.touch_updated()
        await integration.save()
        raise
    except GmailError:
        raise

    summary_text, content_text = _build_texts(
        total_unread,
        primary_total,
        primary_msgs,
        important_total,
        important_msgs,
    )

    metadata = {
        "unread_total": total_unread,
        "primary_total": primary_total,
        "important_total": important_total,
        "primary_messages": primary_msgs,
        "important_messages": important_msgs,
        "synced_at": datetime.now(timezone.utc).isoformat(),
    }

    existing = await LongTermContext.find_one(
        LongTermContext.user.id == user.id,
        LongTermContext.source_ref == GMAIL_SOURCE_REF,
    )

    if existing is None:
        doc = LongTermContext(
            user=user,
            context_type="other",
            title="Unread email (Gmail)",
            content=content_text,
            summary=summary_text,
            importance=6,
            source="gmail",
            source_ref=GMAIL_SOURCE_REF,
            tags=["gmail", "email", "inbox"],
            metadata=metadata,
        )
        await doc.insert()
        logger.info("Created Gmail LongTermContext for user=%s", user.id)
        return doc

    existing.content = content_text
    existing.summary = summary_text
    existing.metadata = metadata
    existing.is_archived = False
    existing.touch_updated()
    await existing.save()
    logger.info("Updated Gmail LongTermContext for user=%s", user.id)
    return existing
