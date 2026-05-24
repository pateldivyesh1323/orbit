from datetime import date
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.phone import normalize_whatsapp_number
from app.core.time_value import normalize_time_value
from app.core.timezone import normalize_timezone


class UserContact(BaseModel):
    email: str
    phone_number: str | None = None
    whatsapp_number: str | None = None

    @field_validator("whatsapp_number")
    @classmethod
    def validate_whatsapp_number(cls, value: str | None) -> str | None:
        return normalize_whatsapp_number(value)


class UserIdentity(BaseModel):
    display_name: str
    legal_name: str | None = None
    preferred_name: str | None = None
    date_of_birth: date | None = None
    gender: Literal["male", "female", "non_binary", "other", "prefer_not_to_say"] | None = None
    bio: str | None = None
    avatar_url: str | None = None


class UserLocation(BaseModel):
    timezone: str = "UTC"
    locale: str = "en-US"
    city: str | None = None
    region: str | None = None
    country: str | None = None
    nationality: str | None = None
    languages: list[str] = Field(default_factory=lambda: ["en"])

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, value: str) -> str:
        return normalize_timezone(value)


class GoalItem(BaseModel):
    title: str
    description: str | None = None
    area: str | None = None
    target_date: date | None = None
    completed: bool = False


class UserGoals(BaseModel):
    life_mission: str | None = None
    personal_goals: list[str] = Field(default_factory=list)
    short_term: list[GoalItem] = Field(default_factory=list)
    long_term: list[GoalItem] = Field(default_factory=list)
    focus_areas: list[str] = Field(default_factory=list)
    weekly_priorities: list[str] = Field(default_factory=list)


class HabitEntry(BaseModel):
    name: str
    frequency: Literal["daily", "weekly", "custom"] = "daily"
    target: str | None = None
    notes: str | None = None
    active: bool = True


class UserHabits(BaseModel):
    morning_routine: str | None = None
    evening_routine: str | None = None
    tracked_habits: list[HabitEntry] = Field(default_factory=list)
    habits_to_build: list[str] = Field(default_factory=list)
    habits_to_break: list[str] = Field(default_factory=list)


class UserHealth(BaseModel):
    height_cm: float | None = None
    weight_kg: float | None = None
    fitness_level: Literal["sedentary", "light", "moderate", "active", "athlete"] | None = None
    sleep_target_hours: float | None = None
    typical_bedtime: str | None = None
    typical_wake_time: str | None = None
    dietary_preferences: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)
    health_goals: list[str] = Field(default_factory=list)
    medical_notes: str | None = None
    mental_health_notes: str | None = None

    @field_validator("typical_bedtime", "typical_wake_time", mode="before")
    @classmethod
    def validate_time_fields(cls, value: str | None) -> str | None:
        return normalize_time_value(value)


class WorkEntry(BaseModel):
    occupation: str | None = None
    employer: str | None = None
    industry: str | None = None
    work_mode: Literal["remote", "hybrid", "onsite", "unemployed", "student"] | None = None
    work_hours_start: str | None = None
    work_hours_end: str | None = None
    work_days: list[str] = Field(default_factory=list)
    current_projects: list[str] = Field(default_factory=list)
    is_primary: bool = False

    @field_validator("work_hours_start", "work_hours_end", mode="before")
    @classmethod
    def validate_hours(cls, value: str | None) -> str | None:
        return normalize_time_value(value)


class UserWork(BaseModel):
    roles: list[WorkEntry] = Field(default_factory=list)
    productivity_goals: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    career_goals: list[str] = Field(default_factory=list)

    @model_validator(mode="before")
    @classmethod
    def migrate_legacy_shape(cls, data: object) -> object:
        if not isinstance(data, dict):
            return data

        if data.get("roles"):
            return data

        legacy_fields = (
            "occupation",
            "employer",
            "industry",
            "work_mode",
            "work_hours_start",
            "work_hours_end",
            "work_days",
            "current_projects",
        )
        if not any(data.get(field) for field in legacy_fields):
            return data

        entry: dict[str, object] = {"is_primary": True}
        for field in legacy_fields:
            if field in data:
                entry[field] = data.pop(field)

        data["roles"] = [entry]
        return data


class UserOrbitPreferences(BaseModel):
    communication_style: Literal["casual", "professional", "motivating", "direct"] = "motivating"
    check_in_frequency: Literal["low", "medium", "high"] = "medium"
    proactive_nudges_enabled: bool = True
    nickname: str | None = None
    topics_to_avoid: list[str] = Field(default_factory=list)
    custom_instructions: str | None = None


class EmergencyContact(BaseModel):
    name: str
    relationship: str | None = None
    phone: str


class UserEmergency(BaseModel):
    contacts: list[EmergencyContact] = Field(default_factory=list)
    notes: str | None = None
