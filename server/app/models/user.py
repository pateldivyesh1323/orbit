from datetime import datetime, timezone
from typing import Annotated

from beanie import Document, Indexed
from pydantic import EmailStr, Field
from pymongo import IndexModel

from app.core.security import hash_password, verify_password
from app.models.user_profile import (
    UserContact,
    UserEmergency,
    UserGoals,
    UserHabits,
    UserHealth,
    UserIdentity,
    UserLocation,
    UserOrbitPreferences,
    UserWork,
)


class User(Document):
    email: Annotated[EmailStr, Indexed(unique=True)]
    password_hash: str

    contact: UserContact
    identity: UserIdentity
    location: UserLocation = Field(default_factory=UserLocation)
    goals: UserGoals = Field(default_factory=UserGoals)
    habits: UserHabits = Field(default_factory=UserHabits)
    health: UserHealth = Field(default_factory=UserHealth)
    work: UserWork = Field(default_factory=UserWork)
    orbit_preferences: UserOrbitPreferences = Field(default_factory=UserOrbitPreferences)
    emergency: UserEmergency = Field(default_factory=UserEmergency)

    is_active: bool = True
    is_verified: bool = False
    last_login_at: datetime | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "users"
        indexes = [
            IndexModel([("contact.whatsapp_number", 1)], unique=True, sparse=True),
        ]

    def set_password(self, plain_password: str) -> None:
        self.password_hash = hash_password(plain_password)

    def check_password(self, plain_password: str) -> bool:
        return verify_password(plain_password, self.password_hash)

    def touch_updated(self) -> None:
        self.updated_at = datetime.now(timezone.utc)
