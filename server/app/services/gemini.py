from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import AsyncIterator

from google import genai
from google.genai import types

from app.core.config import settings
from app.services.tools import ToolBinding

logger = logging.getLogger(__name__)

MAX_TOOL_ITERATIONS = 5


@dataclass
class GeminiReply:
    text: str
    tool_calls: list[dict] = field(default_factory=list)


@dataclass
class StreamEvent:
    """A single event emitted while streaming a reply.

    kind="chunk" -> `text` holds an incremental delta of the assistant message.
    kind="tool"  -> `tool_name` / `tool_result` describe an executed tool call.
    """

    kind: str
    text: str = ""
    tool_name: str | None = None
    tool_result: dict | None = None


def _client() -> genai.Client:
    return genai.Client(api_key=settings.gemini_api_key)


def _config(
    system_instruction: str,
    tools: list[ToolBinding] | None,
) -> types.GenerateContentConfig:
    config_kwargs: dict = dict(
        system_instruction=system_instruction,
        temperature=0.7,
        max_output_tokens=1024,
    )
    if tools:
        config_kwargs["tools"] = [
            types.Tool(function_declarations=[t.declaration for t in tools])
        ]
    return types.GenerateContentConfig(**config_kwargs)


def _extract_text(response) -> str:
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        return ""
    parts = getattr(candidates[0].content, "parts", None) or []
    chunks = [getattr(p, "text", None) for p in parts]
    return "".join(c for c in chunks if c).strip()


def _extract_function_calls(response) -> list:
    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        return []
    parts = getattr(candidates[0].content, "parts", None) or []
    return [p.function_call for p in parts if getattr(p, "function_call", None)]


async def generate_orbit_reply(
    user_prompt: str,
    *,
    system_instruction: str,
    tools: list[ToolBinding] | None = None,
) -> GeminiReply:
    """Call Gemini, executing any tool calls until the model returns text."""
    client = _client()
    config = _config(system_instruction, tools)
    handlers = {t.name: t.handler for t in (tools or [])}

    contents: list = [
        types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)])
    ]
    tool_calls_log: list[dict] = []

    for iteration in range(MAX_TOOL_ITERATIONS):
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=contents,
            config=config,
        )

        fn_calls = _extract_function_calls(response)
        if not fn_calls:
            text = _extract_text(response)
            return GeminiReply(text=text, tool_calls=tool_calls_log)

        contents.append(response.candidates[0].content)

        tool_response_parts: list = []
        for fn_call in fn_calls:
            name = fn_call.name
            args = dict(fn_call.args or {})
            handler = handlers.get(name)
            if handler is None:
                logger.warning("Gemini called unknown tool %r", name)
                result = {"ok": False, "error": f"Unknown tool '{name}'"}
            else:
                try:
                    result = await handler(**args)
                except TypeError as exc:
                    logger.warning("Bad args for tool %s: %s", name, exc)
                    result = {"ok": False, "error": f"Invalid arguments: {exc}"}
                except Exception:
                    logger.exception("Tool %s raised", name)
                    result = {"ok": False, "error": "Tool execution failed"}
            tool_calls_log.append({"name": name, "args": args, "result": result})
            tool_response_parts.append(
                types.Part.from_function_response(name=name, response=result)
            )

        contents.append(types.Content(role="user", parts=tool_response_parts))
        logger.info(
            "Gemini tool iteration %s: executed %s call(s)", iteration + 1, len(fn_calls)
        )

    logger.warning("Gemini tool loop hit max iterations")
    return GeminiReply(
        text="I'm taking too long to figure that out — please try rephrasing.",
        tool_calls=tool_calls_log,
    )


async def _run_tool(handler, name: str, args: dict) -> dict:
    if handler is None:
        logger.warning("Gemini called unknown tool %r", name)
        return {"ok": False, "error": f"Unknown tool '{name}'"}
    try:
        return await handler(**args)
    except TypeError as exc:
        logger.warning("Bad args for tool %s: %s", name, exc)
        return {"ok": False, "error": f"Invalid arguments: {exc}"}
    except Exception:
        logger.exception("Tool %s raised", name)
        return {"ok": False, "error": "Tool execution failed"}


async def generate_orbit_reply_stream(
    user_prompt: str,
    *,
    system_instruction: str,
    tools: list[ToolBinding] | None = None,
) -> AsyncIterator[StreamEvent]:
    """Stream Gemini's reply token-by-token, executing tool calls inline.

    Yields `StreamEvent`s: text chunks as they arrive, plus a tool event each
    time a function call is executed. The tool loop runs across multiple
    streamed passes until the model produces a final answer with no tool calls.
    """
    client = _client()
    config = _config(system_instruction, tools)
    handlers = {t.name: t.handler for t in (tools or [])}

    contents: list = [
        types.Content(role="user", parts=[types.Part.from_text(text=user_prompt)])
    ]

    for iteration in range(MAX_TOOL_ITERATIONS):
        stream = await client.aio.models.generate_content_stream(
            model=settings.gemini_model,
            contents=contents,
            config=config,
        )

        assistant_parts: list = []
        fn_calls: list = []

        async for chunk in stream:
            candidates = getattr(chunk, "candidates", None) or []
            if not candidates:
                continue
            content = getattr(candidates[0], "content", None)
            if content is None:
                continue
            for part in getattr(content, "parts", None) or []:
                text = getattr(part, "text", None)
                if text:
                    assistant_parts.append(part)
                    yield StreamEvent(kind="chunk", text=text)
                fn_call = getattr(part, "function_call", None)
                if fn_call:
                    assistant_parts.append(part)
                    fn_calls.append(fn_call)

        if not fn_calls:
            return

        contents.append(types.Content(role="model", parts=assistant_parts))

        tool_response_parts: list = []
        for fn_call in fn_calls:
            name = fn_call.name
            args = dict(fn_call.args or {})
            result = await _run_tool(handlers.get(name), name, args)
            yield StreamEvent(kind="tool", tool_name=name, tool_result=result)
            tool_response_parts.append(
                types.Part.from_function_response(name=name, response=result)
            )

        contents.append(types.Content(role="user", parts=tool_response_parts))
        logger.info(
            "Gemini stream tool iteration %s: executed %s call(s)",
            iteration + 1,
            len(fn_calls),
        )

    logger.warning("Gemini streaming tool loop hit max iterations")
