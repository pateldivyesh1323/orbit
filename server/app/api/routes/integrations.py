import asyncio
import logging
from datetime import datetime, timezone

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.integration_security import encrypt_secret
from app.integrations.github.client import (
    GitHubAuthError,
    GitHubError,
    verify_pat,
)
from app.integrations.github.sync import sync_github
from app.integrations.gmail.client import GmailAuthError, GmailError
from app.integrations.gmail.sync import GmailSyncError, sync_gmail
from app.integrations.google_calendar.client import (
    CalendarAuthError,
    CalendarError,
)
from app.integrations.google_calendar.oauth import (
    PROVIDER_BY_SERVICE,
    REQUIRED_SCOPE_BY_SERVICE,
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
from app.integrations.todoist.client import (
    TodoistAuthError,
    TodoistError,
    verify_token,
)
from app.integrations.todoist.sync import sync_todoist
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
    # Land the user back on the integrations tab so they see the result of their connect attempt.
    qs = f"tab=integrations&integration={provider}&status={status_str}"
    if detail:
        from urllib.parse import quote

        qs += f"&detail={quote(detail)}"
    return RedirectResponse(url=f"{base}/dashboard?{qs}")


async def _run_sync(doc: Integration, user: User) -> LongTermContext:
    if doc.provider == "wakatime":
        return await sync_wakatime(doc, user)
    if doc.provider == "google_calendar":
        return await sync_google_calendar(doc, user)
    if doc.provider == "github":
        return await sync_github(doc, user)
    if doc.provider == "gmail":
        return await sync_gmail(doc, user)
    if doc.provider == "todoist":
        return await sync_todoist(doc, user)
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Sync not implemented for provider '{doc.provider}'",
    )


async def _kick_initial_sync(doc: Integration, user: User) -> None:
    """Fire-and-forget initial sync so newly connected integrations populate immediately."""
    try:
        context = await _run_sync(doc, user)
    except Exception as exc:
        logger.warning(
            "Initial sync failed for integration=%s provider=%s: %s",
            doc.id,
            doc.provider,
            exc,
        )
        doc.status = "error"
        doc.last_sync_error = str(exc)[:300]
        doc.touch_updated()
        await doc.save()
        return

    doc.status = "active"
    doc.last_synced_at = datetime.now(timezone.utc)
    doc.last_sync_summary = context.summary
    doc.last_sync_error = None
    doc.touch_updated()
    await doc.save()
    logger.info(
        "Initial sync ok integration=%s provider=%s", doc.id, doc.provider
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
    if body.provider in ("google_calendar", "gmail"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Use the OAuth start endpoint to connect {body.provider}",
        )
    if body.provider not in ("wakatime", "github", "todoist"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Provider '{body.provider}' is not supported yet",
        )

    api_key = (body.credentials.get("api_key") or "").strip()
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"api_key is required for {body.provider}",
        )

    encrypted_credentials: dict[str, str] = {"api_key": encrypt_secret(api_key)}

    if body.provider == "wakatime":
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
    elif body.provider == "todoist":
        try:
            await verify_token(api_key)
        except TodoistAuthError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
        except TodoistError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            ) from exc
    else:  # github
        try:
            profile = await verify_pat(api_key)
        except GitHubAuthError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc),
            ) from exc
        except GitHubError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=str(exc),
            ) from exc
        username = profile.get("login")
        if not username:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="GitHub returned no username",
            )
        # Username isn't a secret — store as plaintext so sync.py can use it.
        encrypted_credentials["username"] = username

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
        asyncio.create_task(_kick_initial_sync(existing, current_user))
        return integration_to_response(existing)

    doc = Integration(
        user=current_user,
        provider=body.provider,
        credentials=encrypted_credentials,
        status="active",
    )
    await doc.insert()
    asyncio.create_task(_kick_initial_sync(doc, current_user))
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
    except (
        WakaTimeAuthError,
        CalendarAuthError,
        GitHubAuthError,
        GmailAuthError,
        TodoistAuthError,
    ) as exc:
        doc.status = "error"
        doc.last_sync_error = str(exc)
        doc.touch_updated()
        await doc.save()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except (
        WakaTimeError,
        CalendarError,
        GoogleCalendarSyncError,
        GitHubError,
        GmailError,
        GmailSyncError,
        TodoistError,
    ) as exc:
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


# --- Google OAuth (calendar + gmail share one client, callback, redirect URI) ---


async def _start_google_oauth(user: User, service: str) -> dict:
    try:
        state = issue_state_token(str(user.id), service)
        url = build_authorization_url(state, service)
    except OAuthConfigError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    return {"authorization_url": url}


@router.post("/oauth/google_calendar/start")
async def google_calendar_oauth_start(
    current_user: User = Depends(get_current_user),
) -> dict:
    return await _start_google_oauth(current_user, "calendar")


@router.post("/oauth/gmail/start")
async def gmail_oauth_start(
    current_user: User = Depends(get_current_user),
) -> dict:
    return await _start_google_oauth(current_user, "gmail")


@router.get("/oauth/google_calendar/callback")
async def google_oauth_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
) -> RedirectResponse:
    """Single callback for all Google services. The service (calendar | gmail)
    travels in the signed state, so one redirect URI covers every Google
    integration."""
    if error:
        return _dashboard_redirect("google_calendar", "error", detail=error)

    if not code or not state:
        return _dashboard_redirect("google_calendar", "error", detail="missing_params")

    try:
        user_id, service = verify_state_token(state)
    except OAuthStateError as exc:
        return _dashboard_redirect("google_calendar", "error", detail=str(exc))

    provider = PROVIDER_BY_SERVICE.get(service, "google_calendar")

    user = await User.get(user_id)
    if user is None or not user.is_active:
        return _dashboard_redirect(provider, "error", detail="user_not_found")

    try:
        tokens = await exchange_code(code)
    except OAuthConfigError as exc:
        return _dashboard_redirect(provider, "error", detail=str(exc))
    except OAuthExchangeError as exc:
        logger.warning("Google OAuth exchange failed for user=%s: %s", user.id, exc)
        return _dashboard_redirect(provider, "error", detail="token_exchange_failed")

    refresh_token = tokens.get("refresh_token")
    access_token = tokens.get("access_token")
    if not refresh_token or not access_token:
        return _dashboard_redirect(provider, "error", detail="no_refresh_token")

    required_scope = REQUIRED_SCOPE_BY_SERVICE.get(service)
    granted_scopes = (tokens.get("scope") or "").split()
    if required_scope and required_scope not in granted_scopes:
        logger.warning(
            "Google OAuth missing %s scope for user=%s granted=%s",
            required_scope,
            user.id,
            granted_scopes,
        )
        return _dashboard_redirect(provider, "error", detail="scope_not_granted")

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
        Integration.provider == provider,
    )
    if existing is not None:
        existing.credentials = encrypted_credentials
        existing.status = "active"
        existing.last_sync_error = None
        existing.touch_updated()
        await existing.save()
        target = existing
    else:
        target = Integration(
            user=user,
            provider=provider,  # type: ignore[arg-type]
            credentials=encrypted_credentials,
            status="active",
        )
        await target.insert()

    asyncio.create_task(_kick_initial_sync(target, user))

    return _dashboard_redirect(provider, "connected")
