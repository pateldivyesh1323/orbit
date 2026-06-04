from __future__ import annotations

import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import httpx
from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

# Google OAuth here is service-aware: one client, one redirect URI, one callback.
# The state JWT carries which service (calendar | gmail) the user is connecting,
# so adding Google services needs no new redirect URI or Cloud Console change.
CALENDAR_SCOPES = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "openid",
    "email",
]
GMAIL_SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "openid",
    "email",
]

SCOPES_BY_SERVICE = {
    "calendar": CALENDAR_SCOPES,
    "gmail": GMAIL_SCOPES,
}
REQUIRED_SCOPE_BY_SERVICE = {
    "calendar": "https://www.googleapis.com/auth/calendar.readonly",
    "gmail": "https://www.googleapis.com/auth/gmail.readonly",
}
# Which Integration.provider each service maps to.
PROVIDER_BY_SERVICE = {
    "calendar": "google_calendar",
    "gmail": "gmail",
}

# Backwards-compatible alias.
SCOPES = CALENDAR_SCOPES

STATE_PURPOSE = "google_oauth"
STATE_TTL_MINUTES = 15


class OAuthConfigError(RuntimeError):
    pass


class OAuthExchangeError(RuntimeError):
    pass


class OAuthStateError(ValueError):
    pass


def _require_config() -> tuple[str, str, str]:
    if not settings.google_oauth_configured:
        raise OAuthConfigError(
            "Google OAuth is not configured. Set GOOGLE_OAUTH_CLIENT_ID, "
            "GOOGLE_OAUTH_CLIENT_SECRET, and GOOGLE_OAUTH_REDIRECT_URI in .env."
        )
    return (
        settings.google_oauth_client_id,  # type: ignore[return-value]
        settings.google_oauth_client_secret,  # type: ignore[return-value]
        settings.google_oauth_redirect_uri,  # type: ignore[return-value]
    )


def issue_state_token(user_id: str, service: str = "calendar") -> str:
    """Signed JWT carrying the user_id + service through Google's redirect."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=STATE_TTL_MINUTES)
    payload = {
        "sub": user_id,
        "purpose": STATE_PURPOSE,
        "service": service,
        "nonce": secrets.token_urlsafe(8),
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def verify_state_token(token: str) -> tuple[str, str]:
    """Return (user_id, service)."""
    try:
        payload = jwt.decode(
            token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm]
        )
    except JWTError as exc:
        raise OAuthStateError("Invalid or expired OAuth state") from exc
    if payload.get("purpose") != STATE_PURPOSE:
        raise OAuthStateError("OAuth state has wrong purpose")
    sub = payload.get("sub")
    if not sub:
        raise OAuthStateError("OAuth state missing subject")
    service = payload.get("service") or "calendar"
    return str(sub), str(service)


def build_authorization_url(state: str, service: str = "calendar") -> str:
    client_id, _, redirect_uri = _require_config()
    scopes = SCOPES_BY_SERVICE.get(service, CALENDAR_SCOPES)
    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(scopes),
        "access_type": "offline",
        "prompt": "consent",
        "include_granted_scopes": "true",
        "state": state,
    }
    return f"{AUTH_ENDPOINT}?{urlencode(params)}"


async def exchange_code(code: str) -> dict[str, Any]:
    """Exchange an authorization code for tokens."""
    client_id, client_secret, redirect_uri = _require_config()
    data = {
        "code": code,
        "client_id": client_id,
        "client_secret": client_secret,
        "redirect_uri": redirect_uri,
        "grant_type": "authorization_code",
    }
    async with httpx.AsyncClient(timeout=15.0) as http:
        response = await http.post(TOKEN_ENDPOINT, data=data)
    if response.status_code >= 400:
        logger.warning(
            "Google token exchange failed status=%s body=%s",
            response.status_code,
            response.text[:300],
        )
        raise OAuthExchangeError(
            f"Token exchange failed ({response.status_code})"
        )
    return response.json()


async def refresh_access_token(refresh_token: str) -> dict[str, Any]:
    client_id, client_secret, _ = _require_config()
    data = {
        "refresh_token": refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "refresh_token",
    }
    async with httpx.AsyncClient(timeout=15.0) as http:
        response = await http.post(TOKEN_ENDPOINT, data=data)
    if response.status_code >= 400:
        logger.warning(
            "Google token refresh failed status=%s body=%s",
            response.status_code,
            response.text[:300],
        )
        raise OAuthExchangeError(
            f"Token refresh failed ({response.status_code})"
        )
    return response.json()
