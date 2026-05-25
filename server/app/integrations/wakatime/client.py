import base64
from datetime import date
from typing import Any

import httpx

WAKATIME_API_BASE = "https://wakatime.com/api/v1"


class WakaTimeError(Exception):
    pass


class WakaTimeAuthError(WakaTimeError):
    pass


def _auth_header(api_key: str) -> str:
    encoded = base64.b64encode(f"{api_key}:".encode("utf-8")).decode("ascii")
    return f"Basic {encoded}"


async def fetch_summaries(
    api_key: str,
    start: date,
    end: date,
    *,
    timeout: float = 15.0,
) -> dict[str, Any]:
    """Fetch the WakaTime summaries between start and end (inclusive)."""
    headers = {"Authorization": _auth_header(api_key)}
    params = {"start": start.isoformat(), "end": end.isoformat()}

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.get(
            f"{WAKATIME_API_BASE}/users/current/summaries",
            headers=headers,
            params=params,
        )

    if response.status_code in (401, 403):
        raise WakaTimeAuthError("Invalid or expired WakaTime API key")
    if response.status_code >= 400:
        raise WakaTimeError(
            f"WakaTime request failed ({response.status_code}): {response.text[:200]}"
        )

    try:
        return response.json()
    except ValueError as exc:
        raise WakaTimeError("WakaTime returned non-JSON response") from exc


async def verify_api_key(api_key: str) -> str:
    """Validate the api key and return the WakaTime user's display name."""
    headers = {"Authorization": _auth_header(api_key)}
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.get(
            f"{WAKATIME_API_BASE}/users/current",
            headers=headers,
        )
    if response.status_code in (401, 403):
        raise WakaTimeAuthError("Invalid WakaTime API key")
    if response.status_code >= 400:
        raise WakaTimeError(
            f"WakaTime auth check failed ({response.status_code})"
        )
    payload = response.json().get("data", {})
    return payload.get("display_name") or payload.get("username") or "WakaTime user"
