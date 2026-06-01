from __future__ import annotations

import logging

from app.core.config import settings
from app.services.realtime.broker import Broker, InProcessBroker, Subscription

logger = logging.getLogger(__name__)

_broker: Broker | None = None


def user_channel(user_id: str) -> str:
    """Channel name for user-scoped realtime events (e.g. proactive nudges)."""
    return f"user:{user_id}"


async def init_broker() -> None:
    global _broker
    if _broker is not None:
        return
    backend = settings.realtime_backend.lower()
    if backend == "redis":
        raise NotImplementedError(
            "Redis realtime backend is not implemented yet; use realtime_backend=memory"
        )
    _broker = InProcessBroker()
    await _broker.start()
    logger.info("Realtime broker started (backend=%s)", backend)


def get_broker() -> Broker:
    assert _broker is not None, "Broker not initialized; call init_broker() in lifespan"
    return _broker


async def close_broker() -> None:
    global _broker
    if _broker is not None:
        await _broker.stop()
        _broker = None


__all__ = [
    "Broker",
    "InProcessBroker",
    "Subscription",
    "user_channel",
    "init_broker",
    "get_broker",
    "close_broker",
]
