from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.models.context import LongTermContext
from app.models.user import User
from app.schemas.context import (
    ContextCreateRequest,
    ContextResponse,
    ContextUpdateRequest,
)
from app.services.embeddings import embed_memory_doc

router = APIRouter(prefix="/api/context", tags=["context"])


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
