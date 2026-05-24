from datetime import datetime, timezone
from typing import Literal

from beanie import Document, Link
from pydantic import Field
from pymongo import IndexModel

from app.models.user import User

MessageRole = Literal["user", "assistant"]
MessageChannel = Literal["whatsapp", "dashboard", "dev"]


class ConversationMessage(Document):
    user: Link[User]
    role: MessageRole
    content: str
    channel: MessageChannel
    external_id: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "conversation_messages"
        indexes = [
            IndexModel([("user", 1), ("created_at", -1)]),
            IndexModel([("user", 1), ("channel", 1), ("created_at", -1)]),
        ]
