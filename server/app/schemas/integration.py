from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.models.integration import IntegrationStatus, Provider


class IntegrationConnectRequest(BaseModel):
    provider: Provider
    credentials: dict[str, str] = Field(default_factory=dict)


class IntegrationResponse(BaseModel):
    id: str
    provider: Provider
    status: IntegrationStatus
    last_synced_at: datetime | None
    last_sync_summary: str | None
    last_sync_error: str | None
    created_at: datetime
    updated_at: datetime


class IntegrationSyncResponse(BaseModel):
    integration: IntegrationResponse
    context_summary: str | None = None
    context_metadata: dict[str, Any] | None = None
