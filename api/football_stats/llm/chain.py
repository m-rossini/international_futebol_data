"""Provider chain — tries primary provider, falls back to secondary on failure."""

from __future__ import annotations

import logging
from typing import Any

from .config import LLMConfig
from .providers import ChatResponse, LLMProvider, create_provider

logger = logging.getLogger("llm.chain")


class ProviderChain:
    """Tries the primary provider, falls back to the secondary on failure.

    Either primary or secondary (or both) can be None. If both are None,
    all calls will raise an error.
    """

    def __init__(self, config: LLMConfig):
        self._config = config
        self._primary: LLMProvider | None = None
        self._fallback: LLMProvider | None = None
        self._init_providers()

    def _init_providers(self) -> None:
        if self._config.primary is not None:
            try:
                self._primary = create_provider(self._config.primary)
                logger.info(
                    "LLM primary provider ready: %s (%s)",
                    self._config.primary.provider,
                    self._config.primary.model,
                )
            except Exception as e:
                logger.error("Failed to init primary provider: %s", e)
                self._primary = None

        if self._config.fallback is not None:
            try:
                self._fallback = create_provider(self._config.fallback)
                logger.info(
                    "LLM fallback provider ready: %s (%s)",
                    self._config.fallback.provider,
                    self._config.fallback.model,
                )
            except Exception as e:
                logger.error("Failed to init fallback provider: %s", e)
                self._fallback = None

    @property
    def is_available(self) -> bool:
        """Return True if at least one provider is configured."""
        return self._primary is not None or self._fallback is not None

    @property
    def active_provider_name(self) -> str | None:
        """Return the name of the active provider, or None."""
        if self._primary is not None:
            return self._config.primary.provider if self._config.primary else None
        if self._fallback is not None:
            return self._config.fallback.provider if self._config.fallback else None
        return None

    async def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        model: str | None = None,
    ) -> ChatResponse:
        """Send a chat request, trying primary then fallback.

        Raises:
            RuntimeError: If no providers are available or both fail.
        """
        errors: list[str] = []

        if self._primary is not None:
            try:
                return await self._primary.chat_with_tools(messages, tools, model)
            except Exception as e:
                primary_name = (
                    self._config.primary.provider if self._config.primary else "primary"
                )
                logger.warning("Primary provider failed (%s): %s", primary_name, e)
                errors.append(f"{primary_name}: {e}")

        if self._fallback is not None:
            try:
                return await self._fallback.chat_with_tools(messages, tools, model)
            except Exception as e:
                fallback_name = (
                    self._config.fallback.provider
                    if self._config.fallback
                    else "fallback"
                )
                logger.warning("Fallback provider failed (%s): %s", fallback_name, e)
                errors.append(f"{fallback_name}: {e}")

        if not errors:
            raise RuntimeError(
                "No LLM providers configured. Set at least one provider in config.json."
            )

        raise RuntimeError(
            "All LLM providers failed. Errors:\n"
            + "\n".join(f"  - {e}" for e in errors)
        )
