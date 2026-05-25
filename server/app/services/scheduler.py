from __future__ import annotations

import asyncio
import logging

from app.core.config import settings
from app.services.integration_sync import sync_all_integrations
from app.services.proactive import run_proactive_check_ins

logger = logging.getLogger(__name__)

_tasks: list[asyncio.Task] = []


async def _run_periodically(
    name: str,
    interval_seconds: float,
    job,
    initial_delay: float,
) -> None:
    await asyncio.sleep(initial_delay)
    while True:
        logger.info("scheduler[%s] running", name)
        try:
            result = await job()
            logger.info("scheduler[%s] result=%s", name, result)
        except asyncio.CancelledError:
            raise
        except Exception:
            logger.exception("scheduler[%s] crashed; continuing", name)
        try:
            await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            raise


def start_background_jobs() -> None:
    if not settings.background_scheduler_enabled:
        logger.info("Background scheduler disabled; relying on external cron")
        return
    if _tasks:
        logger.warning("Scheduler already started; skipping")
        return

    loop = asyncio.get_event_loop()
    initial_delay = float(settings.scheduler_initial_delay_seconds)
    sync_interval = max(60, settings.scheduler_sync_interval_minutes * 60)
    nudge_interval = max(60, settings.scheduler_nudge_interval_minutes * 60)

    _tasks.append(
        loop.create_task(
            _run_periodically(
                "integration_sync",
                sync_interval,
                sync_all_integrations,
                initial_delay,
            )
        )
    )
    _tasks.append(
        loop.create_task(
            _run_periodically(
                "proactive_nudge",
                nudge_interval,
                run_proactive_check_ins,
                initial_delay + 30,  # stagger so they don't fire simultaneously
            )
        )
    )
    logger.info(
        "Background scheduler started: sync=%ss nudge=%ss",
        sync_interval,
        nudge_interval,
    )


async def stop_background_jobs() -> None:
    if not _tasks:
        return
    for task in _tasks:
        task.cancel()
    await asyncio.gather(*_tasks, return_exceptions=True)
    _tasks.clear()
    logger.info("Background scheduler stopped")
