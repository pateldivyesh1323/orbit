from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.models.context import LongTermContext
from app.models.integration import Integration
from app.models.user import User
from app.schemas.context import (
    ContextCreateRequest,
    ContextInspectRequest,
    ContextInspectResponse,
    ContextResponse,
    ContextSection,
    ContextUpdateRequest,
    InspectedMemory,
    InspectedSignal,
)
from app.services.channels import InteractionChannel
from app.services.context import AgentMode, ContextBundle
from app.services.context.sections import (
    render_current_time_block,
    render_history_block,
    render_live_signals_block,
    render_user_profile_block,
)
from app.services.conversation import load_recent_messages
from app.services.embeddings import embed_memory_doc
from app.services.prompt import system_instruction_for
from app.services.user_context import load_live_signals, retrieve_memories

router = APIRouter(prefix="/api/context", tags=["context"])


def _estimate_tokens(chars: int) -> int:
    return round(chars / 4)


def _section(name: str, text: str) -> ContextSection:
    return ContextSection(name=name, chars=len(text), tokens=_estimate_tokens(len(text)))


def context_to_response(doc: LongTermContext) -> ContextResponse:
    return ContextResponse(
        id=str(doc.id),
        context_type=doc.context_type,
        title=doc.title,
        content=doc.content,
        summary=doc.summary,
        importance=doc.importance,
        confidence=doc.confidence,
        source=doc.source,
        source_ref=doc.source_ref,
        tags=doc.tags,
        metadata=doc.metadata,
        expires_at=doc.expires_at,
        is_archived=doc.is_archived,
        access_count=doc.access_count,
        last_accessed_at=doc.last_accessed_at,
        created_at=doc.created_at,
        updated_at=doc.updated_at,
    )


async def get_owned_context(context_id: str, user: User) -> LongTermContext:
    doc = await LongTermContext.find_one(
        LongTermContext.id == context_id,
        LongTermContext.user.id == user.id,
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Context not found")
    return doc


@router.post("", response_model=ContextResponse, status_code=status.HTTP_201_CREATED)
async def create_context(
    body: ContextCreateRequest,
    current_user: User = Depends(get_current_user),
) -> ContextResponse:
    doc = LongTermContext(user=current_user, **body.model_dump())
    await embed_memory_doc(doc)
    await doc.insert()
    return context_to_response(doc)


@router.post("/inspect", response_model=ContextInspectResponse)
async def inspect_context(
    body: ContextInspectRequest,
    current_user: User = Depends(get_current_user),
) -> ContextInspectResponse:
    """Show exactly what Orbit's agent receives for a given message.

    Runs the real context assembly — semantic memory retrieval (with scores),
    live signals, and the rendered prompt — without calling the model. The
    transparency view behind the Context Inspector tab.
    """
    agent_mode = AgentMode(body.mode)
    channel = InteractionChannel(body.channel)

    query = body.message if agent_mode == AgentMode.REACTIVE else None
    scored = await retrieve_memories(current_user, query=query)
    memories = [s.doc for s in scored]
    live_signals = await load_live_signals(current_user)
    history = await load_recent_messages(current_user)

    bundle = ContextBundle(
        user=current_user,
        memories=memories,
        live_signals=live_signals,
        history=history,
    )
    prompt = bundle.render_prompt(
        mode=agent_mode, channel=channel, user_message=body.message
    )
    system_instruction = system_instruction_for(agent_mode)

    time_block = render_current_time_block(current_user)
    profile_block = render_user_profile_block(current_user, memories)
    signals_block = render_live_signals_block(live_signals)
    history_block = render_history_block(history)
    body_parts = [
        time_block,
        ("\n" + profile_block) if profile_block else "",
        signals_block,
        history_block,
    ]
    body_text = "".join(p for p in body_parts if p)
    task_chars = max(len(prompt) - len(body_text), 0)

    sections = [
        _section("Right now", time_block),
        _section("User profile + memory", profile_block),
        _section("Live activity", signals_block),
        _section("Recent conversation", history_block),
        ContextSection(
            name="Current task",
            chars=task_chars,
            tokens=_estimate_tokens(task_chars),
        ),
    ]

    inspected_memories = [
        InspectedMemory(
            id=str(s.doc.id),
            title=s.doc.title,
            context_type=s.doc.context_type,
            source=s.doc.source,
            importance=s.doc.importance,
            similarity=round(s.similarity, 4) if s.similarity is not None else None,
            embedded=s.embedded,
            score=round(s.score, 4),
        )
        for s in scored
    ]
    inspected_signals = [
        InspectedSignal(
            title=x.title,
            source=x.source,
            source_ref=x.source_ref,
            updated_at=x.updated_at,
            summary=x.summary,
        )
        for x in live_signals
    ]

    notes: list[str] = []
    integrations = await Integration.find(
        Integration.user.id == current_user.id
    ).to_list()
    signal_sources = {s.source for s in live_signals}
    for integration in integrations:
        if integration.status != "active":
            continue
        if integration.provider in signal_sources:
            continue
        label = integration.provider.replace("_", " ").title()
        if integration.last_synced_at is None:
            notes.append(
                f"{label} is connected but has never synced — click Sync now on Integrations."
            )
        elif integration.last_sync_error:
            notes.append(f"{label} last sync failed: {integration.last_sync_error}")
        else:
            notes.append(
                f"{label} synced but isn't showing under Live activity — check server logs."
            )
    if not integrations:
        notes.append(
            "No integrations connected — connect one on the Integrations tab to give Orbit live activity."
        )
    if query and inspected_memories and not any(m.embedded for m in inspected_memories):
        notes.append(
            "These memories have no embeddings yet, so they're ranked by importance, not relevance. "
            "Run POST /api/dev/backfill-embeddings."
        )

    return ContextInspectResponse(
        mode=agent_mode.value,
        channel=channel.value,
        query=body.message,
        system_instruction=system_instruction,
        prompt=prompt,
        prompt_chars=len(prompt),
        token_estimate=_estimate_tokens(len(prompt)),
        sections=sections,
        memories=inspected_memories,
        live_signals=inspected_signals,
        history_count=len(history),
        notes=notes,
    )


@router.get("", response_model=list[ContextResponse])
async def list_context(
    current_user: User = Depends(get_current_user),
    include_archived: bool = Query(default=False),
    context_type: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[ContextResponse]:
    filters: list = [LongTermContext.user.id == current_user.id]
    if not include_archived:
        filters.append(LongTermContext.is_archived == False)
    if context_type is not None:
        filters.append(LongTermContext.context_type == context_type)
    docs = (
        await LongTermContext.find(*filters)
        .sort(-LongTermContext.importance, -LongTermContext.created_at)
        .limit(limit)
        .to_list()
    )
    return [context_to_response(doc) for doc in docs]


@router.get("/{context_id}", response_model=ContextResponse)
async def get_context(
    context_id: str,
    current_user: User = Depends(get_current_user),
) -> ContextResponse:
    doc = await get_owned_context(context_id, current_user)
    doc.record_access()
    doc.touch_updated()
    await doc.save()
    return context_to_response(doc)


@router.patch("/{context_id}", response_model=ContextResponse)
async def update_context(
    context_id: str,
    body: ContextUpdateRequest,
    current_user: User = Depends(get_current_user),
) -> ContextResponse:
    doc = await get_owned_context(context_id, current_user)
    updates = body.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(doc, key, value)
    doc.touch_updated()
    await doc.save()
    return context_to_response(doc)


@router.delete("/{context_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_context(
    context_id: str,
    current_user: User = Depends(get_current_user),
) -> None:
    doc = await get_owned_context(context_id, current_user)
    doc.is_archived = True
    doc.touch_updated()
    await doc.save()
