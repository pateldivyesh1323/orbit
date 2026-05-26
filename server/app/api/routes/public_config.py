from fastapi import APIRouter

from app.core.config import settings

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("")
async def get_public_config() -> dict:
    """Public config the frontend can read without auth.

    Used to conditionally hide sign-up UI on closed instances. Keep this surface
    small — anything sensitive belongs behind get_current_user.
    """
    return {
        "allow_registration": settings.allow_registration,
    }
