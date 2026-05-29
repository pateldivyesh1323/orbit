from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.models.context import LongTermContext
from app.models.user import User
from app.services.embeddings import embed_memory_doc

logger = logging.getLogger(__name__)

CONCURRENT_EMBEDS = 4


async def backfill_user_embeddings(user: User) -> dict[str, Any]:
    """Compute embeddings for any of this user's memories that don't have one yet.

    Idempotent — safe to run repeatedly. Returns stats.
    """
    docs = await LongTermContext.find(
        LongTermContext.user.id == user.id,
        LongTermContext.is_archived == False,
        {"$or": [{"embedding": None}, {"embedding": {"$exists": False}}]},
    ).to_list()

    if not docs:
        return {"considered": 0, "embedded": 0, "failed": 0, "skipped_archived": 0}

    embedded = 0
    failed = 0
    sem = asyncio.Semaphore(CONCURRENT_EMBEDS)

    async def _one(doc: LongTermContext) -> bool:
        async with sem:
            try:
                await embed_memory_doc(doc)
                if doc.embedding:
                    await doc.save()
                    return True
                return False
            except Exception:
                logger.exception("backfill failed for memory=%s", doc.id)
                return False

    results = await asyncio.gather(*[_one(d) for d in docs])
    for ok in results:
        if ok:
            embedded += 1
        else:
            failed += 1

    logger.info(
        "Backfill done user=%s considered=%s embedded=%s failed=%s",
        user.id,
        len(docs),
        embedded,
        failed,
    )
    return {
        "considered": len(docs),
        "embedded": embedded,
        "failed": failed,
    }
