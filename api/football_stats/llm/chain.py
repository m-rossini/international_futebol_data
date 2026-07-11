"""Provider chain — tries profiles in priority order (lowest first)."""

from __future__ import annotations

import logging
from typing import Any

from .config import LLMConfig
from .providers import ChatResponse, LLMProvider, create_provider

logger = logging.getLogger("llm.chain")


class ProviderChain:
    """Tries profiles in priority order, falling through to the next on failure."""

    def __init__(self, config: LLMConfig):
        self._config = config
        self._providers: list[tuple[str, LLMProvider]] = []
        self._init_chain()

    # ------------------------------------------------------------------
    #  Initialization
    # ------------------------------------------------------------------

    def _init_chain(self) -> None:
        self._providers = []
        for name, profile in self._config.chain:
            try:
                provider = create_provider(profile)
                self._providers.append((name, provider))
                logger.info(
                    "LLM profile ready [pri=%d]: %s (%s/%s)",
                    profile.priority,
                    name,
                    profile.provider,
                    profile.model,
                )
            except Exception as e:
                logger.error(
                    "Failed to init profile [pri=%d]: %s — %s",
                    profile.priority,
                    name,
                    e,
                )

    def rebuild(self, config: LLMConfig) -> None:
        """Rebuild the chain with a new config (e.g. after profile switch)."""
        self._config = config
        self._init_chain()

    # ------------------------------------------------------------------
    #  Properties
    # ------------------------------------------------------------------

    @property
    def is_available(self) -> bool:
        return len(self._providers) > 0

    @property
    def active_profile_name(self) -> str | None:
        return self._config.active_profile_name

    @property
    def chain_state(self) -> list[dict[str, Any]]:
        """Return the chain for API responses: active full details, fallbacks name+priority."""
        result = []
        for i, (name, _) in enumerate(self._providers):
            profile = self._config.profiles[name]
            item: dict[str, Any] = {
                "name": name,
                "priority": profile.priority,
                "active": i == 0,
            }
            item.update(profile.safe_summary())
            result.append(item)
        return result

    # ------------------------------------------------------------------
    #  Chat
    # ------------------------------------------------------------------

    async def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        model: str | None = None,
    ) -> ChatResponse:
        """Send a chat request, trying profiles in priority order.

        Raises:
            RuntimeError: If no providers are available or all fail.
        """
        errors: list[str] = []

        for name, provider in self._providers:
            try:
                return await provider.chat_with_tools(messages, tools, model)
            except Exception as e:
                logger.warning("Profile '%s' failed: %s", name, e)
                errors.append(f"{name}: {e}")

        if not errors:
            raise RuntimeError(
                "No LLM profiles configured. Add at least one profile in config.json."
            )

        raise RuntimeError(
            "All LLM profiles failed. Errors:\n" + "\n".join(f"  - {e}" for e in errors)
        )
