from fastapi import APIRouter

from app.core.database import get_client

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    try:
        client = get_client()
        await client.admin.command("ping")
        db_status = "ok"
    except Exception:
        db_status = "down"
    return {"status": "ok", "db": db_status}
