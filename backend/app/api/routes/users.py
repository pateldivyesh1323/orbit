from fastapi import APIRouter, Depends

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserDetailResponse, UserUpdateRequest

router = APIRouter(prefix="/api/users", tags=["users"])


def user_to_response(user: User) -> UserDetailResponse:
    return UserDetailResponse(
        id=str(user.id),
        email=user.email,
        contact=user.contact,
        identity=user.identity,
        location=user.location,
        goals=user.goals,
        habits=user.habits,
        health=user.health,
        work=user.work,
        orbit_preferences=user.orbit_preferences,
        emergency=user.emergency,
        is_active=user.is_active,
        is_verified=user.is_verified,
        last_login_at=user.last_login_at,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )


@router.get("/me", response_model=UserDetailResponse)
async def get_me(current_user: User = Depends(get_current_user)) -> UserDetailResponse:
    return user_to_response(current_user)


@router.patch("/me", response_model=UserDetailResponse)
async def update_me(
    body: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> UserDetailResponse:
    updates = body.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(current_user, key, value)
        if key == "contact" and value is not None:
            current_user.email = value.email
    current_user.touch_updated()
    await current_user.save()
    return user_to_response(current_user)
