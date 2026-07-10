"""Profile management — GET /llm/profile and PUT /llm/profile to switch providers at runtime."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException

from football_stats.llm.config import LLMConfig
from football_stats.llm.chain import ProviderChain
from football_stats.llm.executor import ToolExecutor
from football_stats.llm.service import ConversationService
from football_stats.routers.dependencies import engine

__all__ = ["router", "set_conversation_service", "get_conversation_service"]

logger = logging.getLogger("llm.profile")

router = APIRouter(prefix="/llm", tags=["LLM"])

_conversation_service: ConversationService | None = None


def set_conversation_service(service: ConversationService) -> None:
    global _conversation_service
    _conversation_service = service


def get_conversation_service() -> ConversationService | None:
    return _conversation_service


@router.get("/profile")
async def get_profile():
    """Return the current chain state: active profile details + fallback chain."""
    svc = _conversation_service
    if svc is None:
        raise HTTPException(status_code=503, detail="LLM service not configured")

    if not svc.is_available:
        raise HTTPException(status_code=503, detail="No LLM profiles available")

    return {
        "status": "success",
        "data": {
            "active": svc._chain.active_profile_name,
            "chain": svc._chain.chain_state,
        },
    }


@router.put("/profile")
async def switch_profile(body: dict):
    """Switch the active profile by promoting it to top priority.

    Persists the change to config.json and rebuilds the provider chain.
    """
    profile_name = body.get("profile")
    if not profile_name:
        raise HTTPException(status_code=400, detail="Missing 'profile' field")

    svc = _conversation_service
    if svc is None:
        raise HTTPException(status_code=503, detail="LLM service not configured")

    llm_config = LLMConfig.from_file()

    if profile_name not in llm_config.profiles:
        raise HTTPException(status_code=404, detail="Profile not found")

    llm_config.promote_profile(profile_name)

    LLMConfig.save_llm_section(llm_config)

    chain = ProviderChain(llm_config)
    executor = ToolExecutor(engine)
    new_svc = ConversationService(chain, executor, llm_config)
    set_conversation_service(new_svc)

    logger.info(
        "Profile switched to '%s' — chain rebuilt with %d profile(s)",
        profile_name,
        len(llm_config.profiles),
    )

    return {
        "status": "success",
        "data": {
            "active": new_svc._chain.active_profile_name,
            "chain": new_svc._chain.chain_state,
        },
    }
