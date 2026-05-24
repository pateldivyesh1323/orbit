from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.brain import InteractionChannel, process_message

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
async def chat_with_orbit(
    body: ChatRequest,
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    result = await process_message(
        body.message,
        user=current_user,
        channel=InteractionChannel.DASHBOARD,
    )
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Orbit could not generate a reply. Please try again.",
        )

    return ChatResponse(
        reply=result.reply,
        user_id=result.user_id or str(current_user.id),
        display_name=result.display_name or current_user.identity.display_name,
    )
