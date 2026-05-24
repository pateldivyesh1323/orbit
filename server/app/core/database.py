from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.models.user import User
from app.models.integration import Integration
from app.models.context import LongTermContext

_client: AsyncIOMotorClient | None = None


async def init_db() -> None:
    global _client
    _client = AsyncIOMotorClient(settings.mongodb_uri)
    await init_beanie(
        database=_client[settings.mongodb_db_name],
        document_models=[User, Integration, LongTermContext],
    )


async def close_db() -> None:
    if _client is not None:
        _client.close()


def get_client() -> AsyncIOMotorClient:
    assert _client is not None, "DB not initialized"
    return _client
