from datetime import datetime

from pydantic import BaseModel, EmailStr

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


class UserDetailResponse(BaseModel):
    id: str
    email: EmailStr
    contact: UserContact
    identity: UserIdentity
    location: UserLocation
    goals: UserGoals
    habits: UserHabits
    health: UserHealth
    work: UserWork
    orbit_preferences: UserOrbitPreferences
    emergency: UserEmergency
    is_active: bool
    is_verified: bool
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserUpdateRequest(BaseModel):
    contact: UserContact | None = None
    identity: UserIdentity | None = None
    location: UserLocation | None = None
    goals: UserGoals | None = None
    habits: UserHabits | None = None
    health: UserHealth | None = None
    work: UserWork | None = None
    orbit_preferences: UserOrbitPreferences | None = None
    emergency: UserEmergency | None = None
