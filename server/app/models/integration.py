from datetime import datetime, timezone
from typing import Any, Literal

from beanie import Document, Link
from pydantic import Field

from app.models.user import User

Provider = Literal["github", "wakatime", "google_calendar"]
IntegrationStatus = Literal["active", "inactive"]


class Integration(Document):
    user: Link[User]
    provider: Provider
    credentials: dict[str, Any] = Field(default_factory=dict)
    status: IntegrationStatus = "inactive"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "integrations"
