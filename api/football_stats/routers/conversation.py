"""Conversation endpoint — natural language queries via LLM."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from football_stats.llm.service import (
    ConversationRequest,
    ConversationResponse,
    ConversationService,
)
from football_stats.routers.dependencies import require_data

router = APIRouter()

# This will be set by server.py during startup
_conversation_service: ConversationService | None = None


def set_conversation_service(service: ConversationService) -> None:
    """Inject the conversation service at startup."""
    global _conversation_service
    _conversation_service = service


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
async def conversation(request: ConversationRequest) -> ConversationResponse:
    require_data()

    if _conversation_service is None:
        raise HTTPException(
            status_code=503,
            detail="LLM service not configured. Add an 'llm' section to config.json.",
        )

    if not _conversation_service.is_available:
        raise HTTPException(
            status_code=503,
            detail="No LLM providers available. Check API keys and configuration.",
        )

    try:
        return await _conversation_service.chat(request)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error in conversation: {e}",
        )
