import logging
from datetime import datetime, timezone

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.integration_security import encrypt_secret
from app.integrations.wakatime.client import (
    WakaTimeAuthError,
    WakaTimeError,
    verify_api_key,
)
from app.integrations.wakatime.sync import sync_wakatime
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

    if doc.provider != "wakatime":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sync not implemented for provider '{doc.provider}'",
        )

    try:
        context = await sync_wakatime(doc, current_user)
    except WakaTimeAuthError as exc:
        doc.status = "error"
        doc.last_sync_error = str(exc)
        doc.touch_updated()
        await doc.save()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except WakaTimeError as exc:
        doc.status = "error"
        doc.last_sync_error = str(exc)
        doc.touch_updated()
        await doc.save()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        logger.exception("WakaTime sync failed for integration=%s", doc.id)
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
