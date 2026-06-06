from __future__ import annotations

from typing import Any

import httpx

GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1"


class GmailError(Exception):
    pass


class GmailAuthError(GmailError):
    pass


def _headers(access_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {access_token}"}


def _raise_for(response: httpx.Response, label: str) -> None:
    if response.status_code == 401:
        raise GmailAuthError("Gmail access token rejected")
    if response.status_code >= 400:
        raise GmailError(f"Gmail {label} failed ({response.status_code}): {response.text[:200]}")


def _header_value(headers: list[dict[str, Any]], name: str) -> str | None:
    for h in headers:
        if (h.get("name") or "").lower() == name.lower():
            return h.get("value")
    return None


async def count_messages(
    access_token: str,
    *,
    query: str = "in:inbox",
    timeout: float = 10.0,
) -> int:
    """Return Gmail's estimated match count for a query without fetching bodies."""
    async with httpx.AsyncClient(timeout=timeout) as http:
        listing = await http.get(
            f"{GMAIL_API_BASE}/users/me/messages",
            headers=_headers(access_token),
            params={"q": query, "maxResults": 1},
        )
        _raise_for(listing, "message count")
        payload = listing.json()
        return int(payload.get("resultSizeEstimate") or 0)


async def search_messages(
    access_token: str,
    *,
    query: str = "in:inbox",
    max_results: int = 12,
    timeout: float = 15.0,
) -> tuple[int, list[dict[str, Any]]]:
    """Return (estimated_total_matching, messages[]) for the Gmail query.

    Each message dict: {from, subject, snippet, date}. Uses metadata-only
    fetches — no message bodies are read.
    """
    async with httpx.AsyncClient(timeout=timeout) as http:
        listing = await http.get(
            f"{GMAIL_API_BASE}/users/me/messages",
            headers=_headers(access_token),
            params={"q": query, "maxResults": max_results},
        )
        _raise_for(listing, "message list")
        payload = listing.json()
        total = int(payload.get("resultSizeEstimate") or 0)
        ids = [m["id"] for m in (payload.get("messages") or []) if m.get("id")]

        messages: list[dict[str, Any]] = []
        for message_id in ids:
            detail = await http.get(
                f"{GMAIL_API_BASE}/users/me/messages/{message_id}",
                headers=_headers(access_token),
                params={
                    "format": "metadata",
                    "metadataHeaders": ["From", "Subject", "Date"],
                },
            )
            _raise_for(detail, "message get")
            data = detail.json()
            headers = (data.get("payload") or {}).get("headers") or []
            messages.append(
                {
                    "from": _header_value(headers, "From") or "(unknown sender)",
                    "subject": _header_value(headers, "Subject") or "(no subject)",
                    "snippet": (data.get("snippet") or "").strip(),
                    "date": _header_value(headers, "Date"),
                }
            )

    return total, messages
