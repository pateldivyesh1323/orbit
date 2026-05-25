from datetime import datetime, timezone
from typing import Literal

from beanie import Document, Link
from pydantic import Field
from pymongo import IndexModel

from app.models.user import User

Provider = Literal["github", "wakatime", "google_calendar"]
IntegrationStatus = Literal["active", "inactive", "error"]


class Integration(Document):
    user: Link[User]
    provider: Provider
    credentials: dict[str, str] = Field(default_factory=dict)
    status: IntegrationStatus = "inactive"
    last_synced_at: datetime | None = None
    last_sync_summary: str | None = None
    last_sync_error: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "integrations"
        indexes = [
            IndexModel([("user", 1), ("provider", 1)], unique=True),
        ]

    def touch_updated(self) -> None:
        self.updated_at = datetime.now(timezone.utc)
