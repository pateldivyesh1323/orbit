from datetime import datetime, timedelta, timezone

from app.models.conversation import ConversationMessage, MessageChannel
from app.models.user import User

RECENT_HISTORY_LIMIT = 20
HISTORY_SNIPPET_MAX_CHARS = 500


async def load_recent_messages(
    user: User,
    limit: int = RECENT_HISTORY_LIMIT,
) -> list[ConversationMessage]:
    docs = (
        await ConversationMessage.find(ConversationMessage.user.id == user.id)
        .sort(-ConversationMessage.created_at, -ConversationMessage.id)
        .limit(limit)
        .to_list()
    )
    return list(reversed(docs))


async def save_conversation_turn(
    user: User,
    channel: MessageChannel,
    user_message: str,
    assistant_reply: str,
    *,
    external_id: str | None = None,
) -> None:
    now = datetime.now(timezone.utc)
    user_doc = ConversationMessage(
        user=user,
        role="user",
        content=user_message,
        channel=channel,
        external_id=external_id,
        created_at=now,
    )
    assistant_doc = ConversationMessage(
        user=user,
        role="assistant",
        content=assistant_reply,
        channel=channel,
        created_at=now + timedelta(milliseconds=1),
    )
    await user_doc.insert()
    await assistant_doc.insert()
