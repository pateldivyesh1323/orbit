from fastapi import APIRouter, Depends, Query

from app.api.deps import get_current_user
from app.models.conversation import ConversationMessage
from app.models.user import User
from app.schemas.conversation import ConversationMessageResponse

router = APIRouter(prefix="/api/conversations", tags=["conversations"])


def message_to_response(doc: ConversationMessage) -> ConversationMessageResponse:
    return ConversationMessageResponse(
        id=str(doc.id),
        role=doc.role,
        content=doc.content,
        channel=doc.channel,
        external_id=doc.external_id,
        created_at=doc.created_at,
    )


@router.get("/messages", response_model=list[ConversationMessageResponse])
async def list_conversation_messages(
    current_user: User = Depends(get_current_user),
    channel: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
) -> list[ConversationMessageResponse]:
    filters: list = [ConversationMessage.user.id == current_user.id]
    if channel and channel != "all":
        filters.append(ConversationMessage.channel == channel)
    docs = (
        await ConversationMessage.find(*filters)
        .sort(-ConversationMessage.created_at)
        .limit(limit)
        .to_list()
    )
    docs.reverse()
    return [message_to_response(doc) for doc in docs]
