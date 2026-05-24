from datetime import date, time
from typing import Literal

from pydantic import BaseModel, Field


class UserContact(BaseModel):
    email: str
    phone_number: str | None = None
    whatsapp_number: str | None = None


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


class GoalItem(BaseModel):
    title: str
    description: str | None = None
    area: str | None = None
    target_date: date | None = None
    completed: bool = False


class UserGoals(BaseModel):
    life_mission: str | None = None
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
    typical_bedtime: time | None = None
    typical_wake_time: time | None = None
    dietary_preferences: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    conditions: list[str] = Field(default_factory=list)
    medications: list[str] = Field(default_factory=list)
    health_goals: list[str] = Field(default_factory=list)
    medical_notes: str | None = None
    mental_health_notes: str | None = None


class UserWork(BaseModel):
    occupation: str | None = None
    employer: str | None = None
    industry: str | None = None
    work_mode: Literal["remote", "hybrid", "onsite", "unemployed", "student"] | None = None
    work_hours_start: time | None = None
    work_hours_end: time | None = None
    work_days: list[str] = Field(default_factory=list)
    productivity_goals: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)
    current_projects: list[str] = Field(default_factory=list)
    career_goals: list[str] = Field(default_factory=list)


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
