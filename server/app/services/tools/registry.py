from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any, Awaitable, Callable

from google.genai import types

from app.models.integration import Integration
from app.models.user import User
from app.services.tools import add_memory as add_memory_tool
from app.services.tools import archive_memory as archive_memory_tool
from app.services.tools import calendar_events as calendar_tool
from app.services.tools import github_activity as github_activity_tool
from app.services.tools import github_pull_requests as github_prs_tool
from app.services.tools import snooze as snooze_tool
from app.services.tools import update_goals as update_goals_tool

logger = logging.getLogger(__name__)

ToolHandler = Callable[..., Awaitable[dict[str, Any]]]


@dataclass
class ToolBinding:
    """A tool wired to a specific user. Pairs the Gemini schema with a runtime handler."""
    declaration: types.FunctionDeclaration
    handler: ToolHandler

    @property
    def name(self) -> str:
        return self.declaration.name


async def build_user_tool_bindings(user: User) -> list[ToolBinding]:
    """Build the set of tools available to this user. Some tools only appear when their
    backing integration is connected, so the model isn't tempted to call dead tools."""
    bindings: list[ToolBinding] = [
        ToolBinding(
            declaration=snooze_tool.declaration,
            handler=lambda **kwargs: snooze_tool.handle(user=user, **kwargs),
        ),
        ToolBinding(
            declaration=update_goals_tool.declaration,
            handler=lambda **kwargs: update_goals_tool.handle(user=user, **kwargs),
        ),
        ToolBinding(
            declaration=add_memory_tool.declaration,
            handler=lambda **kwargs: add_memory_tool.handle(user=user, **kwargs),
        ),
        ToolBinding(
            declaration=archive_memory_tool.declaration,
            handler=lambda **kwargs: archive_memory_tool.handle(user=user, **kwargs),
        ),
    ]

    try:
        integrations = await Integration.find(
            Integration.user.id == user.id
        ).to_list()
    except Exception:
        logger.exception("Failed to load integrations for tool binding")
        integrations = []

    active_providers: set[str] = {
        i.provider for i in integrations if i.status != "inactive"
    }

    if "google_calendar" in active_providers:
        bindings.append(
            ToolBinding(
                declaration=calendar_tool.declaration,
                handler=lambda **kwargs: calendar_tool.handle(user=user, **kwargs),
            )
        )

    if "github" in active_providers:
        bindings.append(
            ToolBinding(
                declaration=github_activity_tool.declaration,
                handler=lambda **kwargs: github_activity_tool.handle(user=user, **kwargs),
            )
        )
        bindings.append(
            ToolBinding(
                declaration=github_prs_tool.declaration,
                handler=lambda **kwargs: github_prs_tool.handle(user=user, **kwargs),
            )
        )

    return bindings
