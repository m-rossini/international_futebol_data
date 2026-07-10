"""Conversation endpoint — natural language queries via LLM."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException

from football_stats.llm.service import (
    ConversationRequest,
    ConversationResponse,
    ConversationService,
)
from football_stats.routers.dependencies import (
    get_conversation_service,
    require_data,
)

router = APIRouter()


@router.post(
    "/conversation",
    response_model=ConversationResponse,
    summary="Natural language query",
    description=(
        "Ask a question about international football data in natural language. "
        "The LLM will interpret your query, call the appropriate data tools, "
        "and return a conversational answer. Pass conversation_id to continue "
        "a previous conversation."
    ),
)
async def conversation(
    request: ConversationRequest,
    service: ConversationService | None = Depends(get_conversation_service),
    _: None = Depends(require_data),
) -> ConversationResponse:
    if service is None:
        raise HTTPException(
            status_code=503,
            detail="LLM service not configured. Add an 'llm' section to config.json.",
        )

    if not service.is_available:
        raise HTTPException(
            status_code=503,
            detail="No LLM providers available. Check API keys and configuration.",
        )

    try:
        return await service.chat(request)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error in conversation: {e}",
        )
