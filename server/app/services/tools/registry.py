from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from google.genai import types

from app.models.user import User
from app.services.tools import snooze as snooze_tool

ToolHandler = Callable[..., Awaitable[dict[str, Any]]]


@dataclass
class ToolBinding:
    """A tool wired to a specific user. Pairs the Gemini schema with a runtime handler."""
    declaration: types.FunctionDeclaration
    handler: ToolHandler

    @property
    def name(self) -> str:
        return self.declaration.name


def build_user_tool_bindings(user: User) -> list[ToolBinding]:
    return [
        ToolBinding(
            declaration=snooze_tool.declaration,
            handler=lambda **kwargs: snooze_tool.handle(user=user, **kwargs),
        ),
    ]
