import logging

from app.models.user import User
from app.services.gemini import generate_orbit_reply
from app.services.prompt import build_gemini_contents
from app.services.user_context import load_user_memories

logger = logging.getLogger(__name__)

UNKNOWN_USER_REPLY = (
    "Hi! I'm Orbit. I don't recognize this WhatsApp number yet. "
    "Sign up at your Orbit dashboard and add this number to your profile, then message me again."
)

EMPTY_MESSAGE_REPLY = "I didn't catch a message. Send me some text and I'll help."


async def generate_reply_for_user(user: User, message: str) -> str:
    text = message.strip()
    if not text:
        return EMPTY_MESSAGE_REPLY

    memories = await load_user_memories(user)
    prompt = build_gemini_contents(user, memories, text)
    logger.info("Generating Orbit reply for user %s", user.id)
    return await generate_orbit_reply(prompt)
