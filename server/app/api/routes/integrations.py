import logging
from datetime import datetime, timezone

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.integration_security import encrypt_secret
from app.integrations.google_calendar.client import (
    CalendarAuthError,
    CalendarError,
)
from app.integrations.google_calendar.oauth import (
    OAuthConfigError,
    OAuthExchangeError,
    OAuthStateError,
    build_authorization_url,
    exchange_code,
    issue_state_token,
    verify_state_token,
)
from app.integrations.google_calendar.sync import (
    GoogleCalendarSyncError,
    sync_google_calendar,
)
from app.integrations.wakatime.client import (
    WakaTimeAuthError,
    WakaTimeError,
    verify_api_key,
)
from app.integrations.wakatime.sync import sync_wakatime
from app.models.context import LongTermContext
from app.models.integration import Integration
from app.models.user import User
from app.schemas.integration import (
    IntegrationConnectRequest,
    IntegrationResponse,
    IntegrationSyncResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


def integration_to_response(doc: Integration) -> IntegrationResponse:
    return IntegrationResponse(
        id=str(doc.id),
        provider=doc.provider,
        status=doc.status,
        last_synced_at=doc.last_synced_at,
        last_sync_summary=doc.last_sync_summary,
        last_sync_error=doc.last_sync_error,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


async def get_owned_integration(integration_id: str, user: User) -> Integration:
    try:
        oid = PydanticObjectId(integration_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found",
        ) from exc

    doc = await Integration.find_one(
        Integration.id == oid,
        Integration.user.id == user.id,
    )
    if doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Integration not found",
        )
    return doc


def _dashboard_redirect(provider: str, status_str: str, detail: str | None = None) -> RedirectResponse:
    base = settings.frontend_url.rstrip("/")
    qs = f"integration={provider}&status={status_str}"
    if detail:
        from urllib.parse import quote

        qs += f"&detail={quote(detail)}"
    return RedirectResponse(url=f"{base}/dashboard?{qs}")


async def _run_sync(doc: Integration, user: User) -> LongTermContext:
    if doc.provider == "wakatime":
        return await sync_wakatime(doc, user)
    if doc.provider == "google_calendar":
        return await sync_google_calendar(doc, user)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Sync not implemented for provider '{doc.provider}'",
    )


@router.get("", response_model=list[IntegrationResponse])
async def list_integrations(
    current_user: User = Depends(get_current_user),
) -> list[IntegrationResponse]:
    docs = await Integration.find(
        Integration.user.id == current_user.id
    ).to_list()
    return [integration_to_response(doc) for doc in docs]


@router.post(
    "",
    response_model=IntegrationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def connect_integration(
    body: IntegrationConnectRequest,
    current_user: User = Depends(get_current_user),
) -> IntegrationResponse:
    if body.provider == "google_calendar":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use POST /api/integrations/oauth/google_calendar/start for Google Calendar",
        )
    if body.provider != "wakatime":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider '{body.provider}' is not supported yet",
        )

    api_key = (body.credentials.get("api_key") or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="api_key is required for WakaTime",
        )

    try:
        await verify_api_key(api_key)
    except WakaTimeAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except WakaTimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    encrypted_credentials = {"api_key": encrypt_secret(api_key)}

    existing = await Integration.find_one(
        Integration.user.id == current_user.id,
        Integration.provider == body.provider,
    )
    if existing is not None:
        existing.credentials = encrypted_credentials
        existing.status = "active"
        existing.last_sync_error = None
        existing.touch_updated()
        await existing.save()
        return integration_to_response(existing)

    doc = Integration(
        user=current_user,
        provider=body.provider,
        credentials=encrypted_credentials,
        status="active",
    )
    await doc.insert()
    return integration_to_response(doc)


@router.delete("/{integration_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_integration(
    integration_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    doc = await get_owned_integration(integration_id, current_user)
    await doc.delete()


@router.post("/{integration_id}/sync", response_model=IntegrationSyncResponse)
async def trigger_integration_sync(
    integration_id: str,
    current_user: User = Depends(get_current_user),
) -> IntegrationSyncResponse:
    doc = await get_owned_integration(integration_id, current_user)

    try:
        context = await _run_sync(doc, current_user)
    except (WakaTimeAuthError, CalendarAuthError) as exc:
        doc.status = "error"
        doc.last_sync_error = str(exc)
        doc.touch_updated()
        await doc.save()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except (WakaTimeError, CalendarError, GoogleCalendarSyncError) as exc:
        doc.status = "error"
        doc.last_sync_error = str(exc)
        doc.touch_updated()
        await doc.save()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Sync failed for integration=%s", doc.id)
        doc.status = "error"
        doc.last_sync_error = "Unexpected sync error"
        doc.touch_updated()
        await doc.save()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Sync failed unexpectedly",
        ) from exc

    doc.status = "active"
    doc.last_synced_at = datetime.now(timezone.utc)
    doc.last_sync_summary = context.summary
    doc.last_sync_error = None
    doc.touch_updated()
    await doc.save()

    return IntegrationSyncResponse(
        integration=integration_to_response(doc),
        context_summary=context.summary,
        context_metadata=context.metadata,
    )


# --- Google Calendar OAuth ---


@router.post("/oauth/google_calendar/start")
async def google_calendar_oauth_start(
    current_user: User = Depends(get_current_user),
) -> dict:
    try:
        state = issue_state_token(str(current_user.id))
        url = build_authorization_url(state)
    except OAuthConfigError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    return {"authorization_url": url}


@router.get("/oauth/google_calendar/callback")
async def google_calendar_oauth_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> RedirectResponse:
    if error:
        return _dashboard_redirect("google_calendar", "error", detail=error)

    if not code or not state:
        return _dashboard_redirect("google_calendar", "error", detail="missing_params")

    try:
        user_id = verify_state_token(state)
    except OAuthStateError as exc:
        return _dashboard_redirect("google_calendar", "error", detail=str(exc))

    user = await User.get(user_id)
    if user is None or not user.is_active:
        return _dashboard_redirect("google_calendar", "error", detail="user_not_found")

    try:
        tokens = await exchange_code(code)
    except OAuthConfigError as exc:
        return _dashboard_redirect("google_calendar", "error", detail=str(exc))
    except OAuthExchangeError as exc:
        logger.warning("Google OAuth exchange failed for user=%s: %s", user.id, exc)
        return _dashboard_redirect("google_calendar", "error", detail="token_exchange_failed")

    refresh_token = tokens.get("refresh_token")
    access_token = tokens.get("access_token")
    if not refresh_token or not access_token:
        return _dashboard_redirect(
            "google_calendar", "error", detail="no_refresh_token"
        )

    from datetime import timedelta

    expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=int(tokens.get("expires_in", 3600))
    )

    encrypted_credentials = {
        "refresh_token": encrypt_secret(refresh_token),
        "access_token": encrypt_secret(access_token),
        "expires_at": expires_at.isoformat(),
        "scope": tokens.get("scope", ""),
    }

    existing = await Integration.find_one(
        Integration.user.id == user.id,
        Integration.provider == "google_calendar",
    )
    if existing is not None:
        existing.credentials = encrypted_credentials
        existing.status = "active"
        existing.last_sync_error = None
        existing.touch_updated()
        await existing.save()
    else:
        doc = Integration(
            user=user,
            provider="google_calendar",
            credentials=encrypted_credentials,
            status="active",
        )
        await doc.insert()

    return _dashboard_redirect("google_calendar", "connected")
