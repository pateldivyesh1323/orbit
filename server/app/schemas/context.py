from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

from app.models.context import ContextSource, ContextType


class ContextCreateRequest(BaseModel):
    context_type: ContextType = "fact"
    title: str = Field(min_length=1, max_length=200)
    content: str = Field(min_length=1)
    summary: str | None = None
    importance: int = Field(default=5, ge=1, le=10)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    source: ContextSource = "manual"
    source_ref: str | None = None
    tags: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
    expires_at: datetime | None = None


class ContextUpdateRequest(BaseModel):
    context_type: ContextType | None = None
    title: str | None = Field(default=None, min_length=1, max_length=200)
    content: str | None = Field(default=None, min_length=1)
    summary: str | None = None
    importance: int | None = Field(default=None, ge=1, le=10)
    confidence: float | None = Field(default=None, ge=0.0, le=1.0)
    tags: list[str] | None = None
    metadata: dict[str, Any] | None = None
    expires_at: datetime | None = None
    is_archived: bool | None = None


class ContextResponse(BaseModel):
    id: str
    context_type: ContextType
    title: str
    content: str
    summary: str | None
    importance: int
    confidence: float | None
    source: ContextSource
    source_ref: str | None
    tags: list[str]
    metadata: dict[str, Any]
    expires_at: datetime | None
    is_archived: bool
    access_count: int
    last_accessed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class ContextInspectRequest(BaseModel):
    message: str = Field(default="", max_length=4000)
    mode: Literal["reactive", "proactive"] = "reactive"
    channel: Literal["dashboard", "whatsapp", "dev"] = "dashboard"


class InspectedMemory(BaseModel):
    id: str
    title: str
    context_type: ContextType
    source: ContextSource
    importance: int
    similarity: float | None
    embedded: bool
    score: float


class InspectedSignal(BaseModel):
    title: str
    source: ContextSource
    source_ref: str | None
    updated_at: datetime
    summary: str | None


class ContextSection(BaseModel):
    name: str
    chars: int
    tokens: int


class ContextInspectResponse(BaseModel):
    mode: str
    channel: str
    query: str
    system_instruction: str
    prompt: str
    prompt_chars: int
    token_estimate: int
    sections: list[ContextSection]
    memories: list[InspectedMemory]
    live_signals: list[InspectedSignal]
    history_count: int
    notes: list[str]
