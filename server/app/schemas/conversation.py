from datetime import datetime
from typing import Literal

from pydantic import BaseModel

MessageChannel = Literal["whatsapp", "dashboard", "dev", "all"]


class ConversationMessageResponse(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    channel: Literal["whatsapp", "dashboard", "dev"]
    external_id: str | None
    created_at: datetime
