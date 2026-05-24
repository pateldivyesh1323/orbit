import asyncio
import logging

from google import genai
from google.genai import types

from app.core.config import settings
from app.services.prompt import ORBIT_SYSTEM_INSTRUCTION

logger = logging.getLogger(__name__)


def _generate_sync(user_prompt: str) -> str:
    client = genai.Client(api_key=settings.gemini_api_key)
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=ORBIT_SYSTEM_INSTRUCTION,
            temperature=0.7,
            max_output_tokens=1024,
        ),
    )
    text = response.text
    if not text:
        raise ValueError("Gemini returned an empty response")
    return text.strip()


async def generate_orbit_reply(user_prompt: str) -> str:
    try:
        return await asyncio.to_thread(_generate_sync, user_prompt)
    except Exception:
        logger.exception("Gemini generation failed")
        raise
