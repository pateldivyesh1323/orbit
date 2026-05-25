from app.core.phone import normalize_whatsapp_number
from app.models.context import LongTermContext
from app.models.user import User

MEMORY_LIMIT = 12

LIVE_SIGNAL_SOURCES = ("wakatime", "github", "google_calendar", "cron_sync")


async def find_user_by_whatsapp(whatsapp_number: str) -> User | None:
    normalized = normalize_whatsapp_number(whatsapp_number)
    if not normalized:
        return None
    return await User.find_one(User.contact.whatsapp_number == normalized)


async def load_user_memories(user: User, limit: int = MEMORY_LIMIT) -> list[LongTermContext]:
    return (
        await LongTermContext.find(
            LongTermContext.user.id == user.id,
            LongTermContext.is_archived == False,
            {"source": {"$nin": list(LIVE_SIGNAL_SOURCES)}},
        )
        .sort(-LongTermContext.importance, -LongTermContext.created_at)
        .limit(limit)
        .to_list()
    )


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
