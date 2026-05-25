import logging
from dataclasses import dataclass

from app.models.user import User
from app.services.channels import InteractionChannel
from app.services.conversation import load_recent_messages, save_conversation_turn
from app.services.gemini import generate_orbit_reply
from app.services.prompt import build_gemini_contents
from app.services.user_context import load_live_signals, load_user_memories

logger = logging.getLogger(__name__)

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
    external_id: str | None = None,
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
        live_signals = await load_live_signals(user)
        history = await load_recent_messages(user)
        prompt = build_gemini_contents(
            user, memories, history, text, channel, live_signals=live_signals
        )
        logger.info(
            "Generating Orbit reply user=%s channel=%s history=%s signals=%s",
            user.id,
            channel.value,
            len(history),
            len(live_signals),
        )
        reply = await generate_orbit_reply(prompt)
        await save_conversation_turn(
            user,
            channel.value,  # type: ignore[arg-type]
            text,
            reply,
            external_id=external_id,
        )
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
