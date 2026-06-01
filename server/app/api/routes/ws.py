from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.security import get_subject_from_token
from app.models.user import User
from app.services.brain import stream_message
from app.services.channels import InteractionChannel
from app.services.realtime import get_broker, user_channel

logger = logging.getLogger(__name__)

router = APIRouter()

AUTH_TIMEOUT_SECONDS = 10.0
WS_UNAUTHORIZED = 4401


async def _authenticate(websocket: WebSocket) -> User | None:
    """Expect a first frame: {"type": "auth", "token": "<jwt>"}."""
    try:
        first = await asyncio.wait_for(
            websocket.receive_json(), timeout=AUTH_TIMEOUT_SECONDS
        )
    except (asyncio.TimeoutError, WebSocketDisconnect, ValueError):
        return None

    if not isinstance(first, dict) or first.get("type") != "auth":
        return None
    token = first.get("token")
    if not token or not isinstance(token, str):
        return None

    try:
        user_id = get_subject_from_token(token)
    except ValueError:
        return None

    user = await User.get(user_id)
    if user is None or not user.is_active:
        return None
    return user


@router.websocket("/ws/chat")
async def chat_ws(websocket: WebSocket) -> None:
    await websocket.accept()

    user = await _authenticate(websocket)
    if user is None:
        await websocket.close(code=WS_UNAUTHORIZED)
        return

    user_id = str(user.id)
    # Single outbound queue + one sender task so the request handler and the
    # nudge forwarder never call websocket.send concurrently (Starlette WS sends
    # are not concurrency-safe).
    outbound: asyncio.Queue[dict[str, Any] | None] = asyncio.Queue()
    await outbound.put({"type": "ready"})

    async def sender() -> None:
        while True:
            msg = await outbound.get()
            if msg is None:
                return
            await websocket.send_json(msg)

    async def forward_nudges() -> None:
        broker = get_broker()
        async with broker.subscribe(user_channel(user_id)) as sub:
            async for message in sub:
                await outbound.put({"type": "nudge", **message})

    sender_task = asyncio.create_task(sender())
    nudge_task = asyncio.create_task(forward_nudges())

    try:
        while True:
            data = await websocket.receive_json()
            if not isinstance(data, dict):
                continue
            mtype = data.get("type")
            if mtype == "ping":
                await outbound.put({"type": "pong"})
                continue
            if mtype != "message":
                continue
            content = (data.get("content") or "").strip()
            if not content:
                continue

            async for event in stream_message(
                content, user=user, channel=InteractionChannel.DASHBOARD
            ):
                await outbound.put(event)
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("WebSocket chat error user=%s", user_id)
    finally:
        nudge_task.cancel()
        await outbound.put(None)
        for task in (nudge_task, sender_task):
            try:
                await task
            except (asyncio.CancelledError, Exception):
                pass
