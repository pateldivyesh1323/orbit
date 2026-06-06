from dataclasses import dataclass

from app.core.phone import normalize_whatsapp_number
from app.models.context import LongTermContext
from app.models.user import User
from app.services.embeddings import cosine_similarity, embed_text

MEMORY_LIMIT = 12

LIVE_SIGNAL_SOURCES = (
    "wakatime",
    "github",
    "google_calendar",
    "gmail",
    "todoist",
    "cron_sync",
)

# How much importance influences the final score relative to semantic similarity.
# Pure semantic = 0.0. Strong importance bias = ~0.1. Used as a tiebreaker.
IMPORTANCE_BLEND = 0.02

# When a memory has no embedding yet (e.g. pre-backfill), it gets this fixed
# floor score so it's still considered, but ranks below any genuinely embedded match.
UNEMBEDDED_FLOOR_SCORE = -1.0


async def find_user_by_whatsapp(whatsapp_number: str) -> User | None:
    normalized = normalize_whatsapp_number(whatsapp_number)
    if not normalized:
        return None
    return await User.find_one(User.contact.whatsapp_number == normalized)


def _importance_sort(docs: list[LongTermContext]) -> list[LongTermContext]:
    return sorted(
        docs,
        key=lambda d: (-d.importance, -d.created_at.timestamp()),
    )


@dataclass
class ScoredMemory:
    """A memory plus the ranking signals that selected it, for inspection."""

    doc: LongTermContext
    score: float
    similarity: float | None
    embedded: bool


def _importance_fallback(
    docs: list[LongTermContext], limit: int
) -> list[ScoredMemory]:
    return [
        ScoredMemory(
            doc=d,
            score=float(d.importance),
            similarity=None,
            embedded=bool(d.embedding),
        )
        for d in _importance_sort(docs)[:limit]
    ]


async def retrieve_memories(
    user: User,
    *,
    query: str | None = None,
    limit: int = MEMORY_LIMIT,
) -> list[ScoredMemory]:
    """Return the most relevant memories with their ranking scores.

    With `query`, rank by cosine similarity over `embedding` (with a small
    importance tiebreaker). Without `query`, fall back to importance sort.
    """
    docs = await LongTermContext.find(
        LongTermContext.user.id == user.id,
        LongTermContext.is_archived == False,
        {"source": {"$nin": list(LIVE_SIGNAL_SOURCES)}},
    ).to_list()

    if not docs:
        return []

    if not query or not query.strip():
        return _importance_fallback(docs, limit)

    query_emb = await embed_text(query)
    if not query_emb:
        return _importance_fallback(docs, limit)

    scored: list[ScoredMemory] = []
    for d in docs:
        if not d.embedding:
            scored.append(
                ScoredMemory(
                    doc=d,
                    score=UNEMBEDDED_FLOOR_SCORE + d.importance * 0.001,
                    similarity=None,
                    embedded=False,
                )
            )
            continue
        sim = cosine_similarity(query_emb, d.embedding)
        score = sim + d.importance * IMPORTANCE_BLEND
        scored.append(
            ScoredMemory(doc=d, score=score, similarity=sim, embedded=True)
        )

    scored.sort(key=lambda s: -s.score)
    return scored[:limit]


async def load_user_memories(
    user: User,
    *,
    query: str | None = None,
    limit: int = MEMORY_LIMIT,
) -> list[LongTermContext]:
    """Relevance-ranked memories for prompt assembly (scores discarded)."""
    scored = await retrieve_memories(user, query=query, limit=limit)
    return [s.doc for s in scored]


async def load_live_signals(user: User) -> list[LongTermContext]:
    """Latest synced data from external integrations (WakaTime, GitHub, Calendar)."""
    return (
        await LongTermContext.find(
            LongTermContext.user.id == user.id,
            LongTermContext.is_archived == False,
            {"source": {"$in": list(LIVE_SIGNAL_SOURCES)}},
        )
        .sort(-LongTermContext.updated_at)
        .to_list()
    )
