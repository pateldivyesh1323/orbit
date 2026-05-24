from datetime import datetime, timezone

from beanie import Document
from pydantic import EmailStr, Field


class User(Document):
    email: EmailStr
    name: str
    goals: list[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
