from __future__ import annotations

import logging
from typing import Literal

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.context import ContextType, LongTermContext
from app.models.user import User
from app.services.channels import InteractionChannel
from app.services.embeddings import embed_memory_doc

logger = logging.getLogger(__name__)

MAX_NEW_MEMORIES_PER_TURN = 3
MIN_USER_MESSAGE_CHARS = 8
EXISTING_TITLES_LIMIT = 40

EXTRACTION_SYSTEM_INSTRUCTION = """You are a memory curator for an AI life copilot called Orbit.

Your job: read one chat turn between the user and Orbit, then extract any DURABLE facts about the user worth remembering for future conversations.

Strict rules:
- DURABLE means useful weeks or months from now. Examples: stated goals, hard preferences, recurring habits, life events, identity facts, commitments, health notes, work context, relationships.
- DO NOT extract: small talk, transient questions ("what time is it"), one-off requests, Orbit's own responses about itself, generic statements, things already in the existing memories list.
- Be SELECTIVE. Most chat turns produce ZERO new memories. Empty list is the default.
- Each memory must be self-contained — readable in 6 months with no chat context.
- Title: short, declarative, 4–10 words. e.g. "Wants to quit Valorant this month".
- Content: 1–2 sentences with the actual fact + any relevant detail.
- importance 1–10: 1=trivial, 5=worth remembering, 8=core identity/goal, 10=defining fact.
- confidence 0.0–1.0: how sure you are the user actually meant this.

Output JSON only. If nothing qualifies, return {"memories": []}."""


class ExtractedMemory(BaseModel):
    context_type: Literal[
        "fact",
        "preference",
        "habit",
        "health",
        "work",
        "relationship",
        "goal_progress",
        "insight",
        "other",
    ] = "fact"
    title: str = Field(min_length=4, max_length=120)
    content: str = Field(min_length=4, max_length=600)
    importance: int = Field(default=5, ge=1, le=10)
    confidence: float = Field(default=0.7, ge=0.0, le=1.0)
    tags: list[str] = Field(default_factory=list, max_length=6)


class ExtractedMemoryBatch(BaseModel):
    memories: list[ExtractedMemory] = Field(default_factory=list, max_length=8)


def _normalize_title(title: str) -> str:
    return " ".join(title.lower().split())


def _looks_like_duplicate(
    candidate_title: str, existing_titles: list[str]
) -> bool:
    norm = _normalize_title(candidate_title)
    if not norm:
        return True
    for existing in existing_titles:
        existing_norm = _normalize_title(existing)
        if not existing_norm:
            continue
        if norm == existing_norm:
            return True
        if norm in existing_norm or existing_norm in norm:
            return True
    return False


def _build_extraction_prompt(
    user: User,
    user_message: str,
    assistant_reply: str,
    channel: InteractionChannel,
    existing_titles: list[str],
) -> str:
    titles_block = (
        "\n".join(f"- {t}" for t in existing_titles[:EXISTING_TITLES_LIMIT])
        or "(none yet)"
    )
    return (
        f"## User identity\n"
        f"- Name: {user.identity.display_name}\n"
        f"- Channel: {channel.value}\n\n"
        f"## Existing memory titles (do NOT duplicate any of these)\n"
        f"{titles_block}\n\n"
        f"## Chat turn\n"
        f"User: {user_message}\n\n"
        f"Orbit: {assistant_reply}\n\n"
        f"## Task\n"
        f"Extract 0–{MAX_NEW_MEMORIES_PER_TURN} new durable memories from this turn. "
        f"Return JSON matching the schema. Default to an empty list."
    )


async def _call_gemini(prompt: str) -> ExtractedMemoryBatch | None:
    client = genai.Client(api_key=settings.gemini_api_key)
    try:
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=EXTRACTION_SYSTEM_INSTRUCTION,
                temperature=0.2,
                response_mime_type="application/json",
                response_schema=ExtractedMemoryBatch,
            ),
        )
    except Exception:
        logger.exception("Memory extraction Gemini call failed")
        return None

    parsed = getattr(response, "parsed", None)
    if isinstance(parsed, ExtractedMemoryBatch):
        return parsed

    text = getattr(response, "text", None)
    if not text:
        return None
    try:
        return ExtractedMemoryBatch.model_validate_json(text)
    except Exception:
        logger.warning("Memory extraction returned unparseable JSON: %r", text[:200])
        return None


async def _load_existing_titles(user: User) -> list[str]:
    docs = (
        await LongTermContext.find(
            LongTermContext.user.id == user.id,
            LongTermContext.is_archived == False,
            {"source": {"$nin": ["wakatime", "google_calendar", "github", "cron_sync"]}},
        )
        .sort(-LongTermContext.updated_at)
        .limit(EXISTING_TITLES_LIMIT)
        .to_list()
    )
    return [d.title for d in docs]


async def extract_and_save_memories(
    user: User,
    user_message: str,
    assistant_reply: str,
    channel: InteractionChannel,
) -> list[LongTermContext]:
    """Run a follow-up Gemini call to extract durable memories and save the new ones."""
    if len(user_message.strip()) < MIN_USER_MESSAGE_CHARS:
        return []

    try:
        existing_titles = await _load_existing_titles(user)
        prompt = _build_extraction_prompt(
            user, user_message, assistant_reply, channel, existing_titles
        )
        batch = await _call_gemini(prompt)
    except Exception:
        logger.exception("Memory extraction setup failed user=%s", user.id)
        return []

    if batch is None or not batch.memories:
        return []

    saved: list[LongTermContext] = []
    for item in batch.memories[:MAX_NEW_MEMORIES_PER_TURN]:
        if _looks_like_duplicate(item.title, existing_titles):
            logger.info(
                "Skipping duplicate-ish memory user=%s title=%r",
                user.id,
                item.title,
            )
            continue
        if item.confidence < 0.5:
            continue

        doc = LongTermContext(
            user=user,
            context_type=item.context_type,  # type: ignore[arg-type]
            title=item.title,
            content=item.content,
            importance=item.importance,
            confidence=item.confidence,
            source="ai_inferred",
            source_ref=f"chat:{channel.value}",
            tags=item.tags,
        )
        await embed_memory_doc(doc)
        await doc.insert()
        saved.append(doc)
        existing_titles.append(item.title)  # in-batch dedup

    if saved:
        logger.info(
            "Extracted %s memory item(s) for user=%s: %s",
            len(saved),
            user.id,
            [d.title for d in saved],
        )
    return saved
