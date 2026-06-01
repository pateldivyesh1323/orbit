from __future__ import annotations

import asyncio
import logging
from abc import ABC, abstractmethod
from collections import defaultdict
from typing import Any, AsyncIterator

logger = logging.getLogger(__name__)

# Bounded per-subscriber buffer. If a slow consumer fills this, we drop the
# oldest events rather than blocking publishers (nudges aren't worth backpressure).
SUBSCRIBER_QUEUE_MAX = 100


class Subscription:
    """An async-iterable subscription to one channel.

    Use as an async context manager so the queue is always detached from the
    broker on exit, even if the consumer task is cancelled:

        async with broker.subscribe("user:123") as sub:
            async for message in sub:
                ...
    """

    def __init__(self, broker: "InProcessBroker", channel: str) -> None:
        self._broker = broker
        self._channel = channel
        self._queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(
            maxsize=SUBSCRIBER_QUEUE_MAX
        )

    @property
    def queue(self) -> "asyncio.Queue[dict[str, Any]]":
        return self._queue

    async def __aenter__(self) -> "Subscription":
        self._broker._attach(self._channel, self._queue)
        return self

    async def __aexit__(self, *exc: object) -> None:
        self._broker._detach(self._channel, self._queue)

    def __aiter__(self) -> AsyncIterator[dict[str, Any]]:
        return self

    async def __anext__(self) -> dict[str, Any]:
        return await self._queue.get()


class Broker(ABC):
    """Pub/sub seam. Swap InProcessBroker for a RedisBroker to fan out across
    instances without touching call sites."""

    @abstractmethod
    async def publish(self, channel: str, message: dict[str, Any]) -> None: ...

    @abstractmethod
    def subscribe(self, channel: str) -> Subscription: ...

    async def start(self) -> None:  # pragma: no cover - trivial
        return None

    async def stop(self) -> None:  # pragma: no cover - trivial
        return None


class InProcessBroker(Broker):
    """Single-process broker. Subscribers in the same event loop get messages
    via in-memory queues. Correct for a one-replica deployment."""

    def __init__(self) -> None:
        self._channels: dict[str, set[asyncio.Queue[dict[str, Any]]]] = defaultdict(
            set
        )

    def _attach(self, channel: str, queue: "asyncio.Queue[dict[str, Any]]") -> None:
        self._channels[channel].add(queue)

    def _detach(self, channel: str, queue: "asyncio.Queue[dict[str, Any]]") -> None:
        subs = self._channels.get(channel)
        if subs is None:
            return
        subs.discard(queue)
        if not subs:
            self._channels.pop(channel, None)

    async def publish(self, channel: str, message: dict[str, Any]) -> None:
        for queue in list(self._channels.get(channel, ())):
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                logger.warning(
                    "Dropping realtime message on full queue (channel=%s)", channel
                )

    def subscribe(self, channel: str) -> Subscription:
        return Subscription(self, channel)
