from pydantic import BaseModel, Field


class DevChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    whatsapp_number: str | None = None
