from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from google import genai
from google.genai import types

from app.core.config import settings

if TYPE_CHECKING:
    from app.models.context import LongTermContext

logger = logging.getLogger(__name__)

# gemini-embedding-001 returns 3072 by default; we truncate via MRL to 768
# for storage efficiency and faster Python cosine.
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIM = 768


async def embed_text(text: str) -> list[float] | None:
    """Compute a single embedding vector for the given text, or None on failure."""
    if not text or not text.strip():
        return None
    try:
        client = genai.Client(api_key=settings.gemini_api_key)
        response = await client.aio.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=EMBEDDING_DIM),
        )
        embeddings = getattr(response, "embeddings", None)
        if not embeddings:
            return None
        values = getattr(embeddings[0], "values", None)
        if not values:
            return None
        return list(values)
    except Exception:
        logger.exception("embedding call failed (text preview=%r)", text[:80])
        return None


def memory_embedding_text(title: str, content: str, summary: str | None = None) -> str:
    """Canonical string we embed for a memory. Keep this stable — changing it
    invalidates existing embeddings."""
    parts = [p for p in (title, summary, content) if p and p.strip()]
    return " — ".join(parts)


async def embed_memory_doc(doc: "LongTermContext") -> None:
    """Mutate `doc.embedding` with a freshly computed vector. No-op on failure."""
    text = memory_embedding_text(doc.title, doc.content, doc.summary)
    vec = await embed_text(text)
    if vec is not None:
        doc.embedding = vec


def cosine_similarity(a: list[float], b: list[float]) -> float:
    """Cosine similarity in pure Python. Returns -1.0 for invalid inputs."""
    if not a or not b or len(a) != len(b):
        return -1.0
    dot = 0.0
    norm_a = 0.0
    norm_b = 0.0
    for x, y in zip(a, b):
        dot += x * y
        norm_a += x * x
        norm_b += y * y
    if norm_a == 0.0 or norm_b == 0.0:
        return -1.0
    return dot / ((norm_a ** 0.5) * (norm_b ** 0.5))
