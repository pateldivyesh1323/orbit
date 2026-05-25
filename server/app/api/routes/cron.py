from fastapi import APIRouter, Depends

from app.api.deps_cron import require_cron_secret
from app.services.integration_sync import sync_all_integrations
from app.services.proactive import run_proactive_check_ins

router = APIRouter(
    prefix="/api/cron",
    tags=["cron"],
    dependencies=[Depends(require_cron_secret)],
)


@router.post("/sync")
async def cron_sync_integrations() -> dict:
    return await sync_all_integrations()


@router.post("/nudge")
async def cron_send_proactive_nudges() -> dict:
    return await run_proactive_check_ins()
