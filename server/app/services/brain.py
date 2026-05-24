import logging
from dataclasses import dataclass
from enum import Enum

from app.models.user import User
from app.services.gemini import generate_orbit_reply
from app.services.prompt import build_gemini_contents
from app.services.user_context import load_user_memories

logger = logging.getLogger(__name__)


class InteractionChannel(str, Enum):
    WHATSAPP = "whatsapp"
    DASHBOARD = "dashboard"
    DEV = "dev"


UNKNOWN_USER_REPLY = (
    "Hi! I'm Orbit. I don't recognize this WhatsApp number yet. "
    "Sign up at your Orbit dashboard and add this number to your profile, then message me again."
)

EMPTY_MESSAGE_REPLY = "I didn't catch a message. Send me some text and I'll help."

GENERATION_ERROR_REPLY = (
    "I'm having trouble thinking right now. Please try again in a moment."
)


@dataclass
class OrbitInteractionResult:
    reply: str
    user: User | None
    channel: InteractionChannel
    success: bool = True

    @property
    def user_id(self) -> str | None:
        return str(self.user.id) if self.user else None

    @property
    def display_name(self) -> str | None:
        if self.user is None:
            return None
        return self.user.identity.display_name


async def process_message(
    message: str,
    *,
    user: User | None,
    channel: InteractionChannel,
) -> OrbitInteractionResult:
    text = message.strip()
    if not text:
        return OrbitInteractionResult(
            reply=EMPTY_MESSAGE_REPLY,
            user=user,
            channel=channel,
        )

    if user is None:
        if channel == InteractionChannel.WHATSAPP:
            return OrbitInteractionResult(
                reply=UNKNOWN_USER_REPLY,
                user=None,
                channel=channel,
            )
        return OrbitInteractionResult(
            reply=GENERATION_ERROR_REPLY,
            user=None,
            channel=channel,
            success=False,
        )

    try:
        memories = await load_user_memories(user)
        prompt = build_gemini_contents(user, memories, text)
        logger.info(
            "Generating Orbit reply user=%s channel=%s",
            user.id,
            channel.value,
        )
        reply = await generate_orbit_reply(prompt)
        return OrbitInteractionResult(
            reply=reply,
            user=user,
            channel=channel,
        )
    except Exception:
        logger.exception(
            "Orbit generation failed user=%s channel=%s",
            user.id,
            channel.value,
        )
        return OrbitInteractionResult(
            reply=GENERATION_ERROR_REPLY,
            user=user,
            channel=channel,
            success=False,
        )
