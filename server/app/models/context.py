from datetime import datetime, timezone
from typing import Any, Literal

from beanie import Document, Link
from pydantic import Field
from pymongo import IndexModel

from app.models.user import User

ContextType = Literal[
    "fact",
    "preference",
    "habit",
    "health",
    "work",
    "relationship",
    "goal_progress",
    "conversation_summary",
    "insight",
    "other",
]

ContextSource = Literal[
    "whatsapp",
    "dashboard",
    "cron_sync",
    "github",
    "wakatime",
    "google_calendar",
    "gmail",
    "todoist",
    "ai_inferred",
    "manual",
]


class LongTermContext(Document):
    user: Link[User]
    context_type: ContextType = "fact"
    title: str
    content: str
    summary: str | None = None
    importance: int = Field(default=5, ge=1, le=10)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    source: ContextSource = "manual"
    source_ref: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    expires_at: datetime | None = None
    is_archived: bool = False
    access_count: int = 0
    last_accessed_at: datetime | None = None
    embedding: list[float] | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "long_term_context"
        indexes = [
            IndexModel([("user", 1), ("is_archived", 1), ("importance", -1)]),
            IndexModel([("user", 1), ("context_type", 1)]),
            IndexModel([("user", 1), ("tags", 1)]),
            IndexModel([("user", 1), ("created_at", -1)]),
        ]

    def touch_updated(self) -> None:
        self.updated_at = datetime.now(timezone.utc)

    def record_access(self) -> None:
        self.access_count += 1
        self.last_accessed_at = datetime.now(timezone.utc)
