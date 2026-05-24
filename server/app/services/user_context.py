from app.core.phone import normalize_whatsapp_number
from app.models.context import LongTermContext
from app.models.user import User

MEMORY_LIMIT = 12


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
        )
        .sort(-LongTermContext.importance, -LongTermContext.created_at)
        .limit(limit)
        .to_list()
    )
