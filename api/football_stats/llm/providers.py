"""LLM provider abstraction and implementations.

Defines a ``LLMProvider`` protocol that all providers must implement, plus
four concrete implementations: Deepseek, Anthropic, Ollama, and OpenAI.

OpenAI-compatible providers (Deepseek, Ollama, OpenAI) share a common base
class to reduce duplication.
"""

from __future__ import annotations

import json
import logging
from abc import ABC, abstractmethod
from typing import Any, Protocol

from pydantic import BaseModel, Field

from .config import LLMProviderConfig

logger = logging.getLogger("llm.providers")


# ---------------------------------------------------------------------------
#  Response models
# ---------------------------------------------------------------------------


class ToolCall(BaseModel):
    """A single tool call requested by the LLM."""

    id: str
    name: str
    arguments: dict[str, Any]


class ChatResponse(BaseModel):
    """Unified response from any LLM provider."""

    content: str | None = None
    tool_calls: list[ToolCall] = Field(default_factory=list)
    finish_reason: str | None = None
    model: str | None = None
    usage: dict[str, int] | None = None


# ---------------------------------------------------------------------------
#  Provider protocol
# ---------------------------------------------------------------------------


class LLMProvider(Protocol):
    """Interface that all LLM providers must implement."""

    async def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        model: str | None = None,
    ) -> ChatResponse:
        """Send a chat completion request with tool definitions.

        Args:
            messages: Conversation history (role, content, etc.).
            tools: Tool definitions in OpenAI function-calling format.
            model: Override the default model for this request.

        Returns:
            ChatResponse with either content or tool_calls populated.
        """
        ...


# ---------------------------------------------------------------------------
#  OpenAI-compatible base (Deepseek, Ollama, OpenAI)
# ---------------------------------------------------------------------------


class OpenAICompatibleProvider(ABC):
    """Base class for providers that use the OpenAI SDK."""

    def __init__(self, config: LLMProviderConfig):
        self._config = config
        self._client = None

    def _get_client(self):
        if self._client is None:
            from openai import OpenAI

            kwargs: dict[str, Any] = {"api_key": self._config.get_api_key() or "none"}
            if self._config.base_url:
                kwargs["base_url"] = self._config.base_url
            self._client = OpenAI(**kwargs)
        return self._client

    @abstractmethod
    def _resolve_model(self, model_override: str | None) -> str:
        """Return the model ID to use for this request."""
        ...

    async def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        model: str | None = None,
    ) -> ChatResponse:
        import openai

        client = self._get_client()
        model_id = self._resolve_model(model)

        try:
            response = client.chat.completions.create(
                model=model_id,
                messages=messages,
                tools=tools if tools else None,
                max_tokens=self._config.max_tokens,
                temperature=self._config.temperature,
            )
        except openai.APIError as e:
            logger.error("LLM API error (%s): %s", model_id, e)
            raise

        choice = response.choices[0]
        message = choice.message

        tool_calls: list[ToolCall] = []
        if message.tool_calls:
            for tc in message.tool_calls:
                try:
                    args = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    args = {}
                tool_calls.append(
                    ToolCall(id=tc.id, name=tc.function.name, arguments=args)
                )

        return ChatResponse(
            content=message.content,
            tool_calls=tool_calls,
            finish_reason=choice.finish_reason,
            model=response.model,
            usage=(
                {
                    "prompt_tokens": response.usage.prompt_tokens,
                    "completion_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }
                if response.usage
                else None
            ),
        )


# ---------------------------------------------------------------------------
#  Concrete providers
# ---------------------------------------------------------------------------


class DeepseekProvider(OpenAICompatibleProvider):
    """Deepseek API (OpenAI-compatible)."""

    def __init__(self, config: LLMProviderConfig):
        super().__init__(config)
        if not self._config.base_url:
            self._config.base_url = "https://api.deepseek.com"

    def _resolve_model(self, model_override: str | None) -> str:
        return model_override or self._config.model


class OllamaProvider(OpenAICompatibleProvider):
    """Ollama local server (OpenAI-compatible endpoint)."""

    def __init__(self, config: LLMProviderConfig):
        super().__init__(config)
        if not self._config.base_url:
            self._config.base_url = "http://localhost:11434/v1"

    def _resolve_model(self, model_override: str | None) -> str:
        return model_override or self._config.model


class OpenAIProvider(OpenAICompatibleProvider):
    """OpenAI API."""

    def _resolve_model(self, model_override: str | None) -> str:
        return model_override or self._config.model


class AnthropicProvider:
    """Anthropic Claude API (uses its own SDK)."""

    def __init__(self, config: LLMProviderConfig):
        self._config = config
        self._client = None

    def _get_client(self):
        if self._client is None:
            from anthropic import Anthropic

            self._client = Anthropic(api_key=self._config.get_api_key())
        return self._client

    async def chat_with_tools(
        self,
        messages: list[dict[str, Any]],
        tools: list[dict[str, Any]],
        model: str | None = None,
    ) -> ChatResponse:
        import anthropic

        client = self._get_client()
        model_id = model or self._config.model

        # Convert OpenAI-style tools to Anthropic format
        anthropic_tools = []
        for tool in tools:
            func = tool.get("function", {})
            anthropic_tools.append(
                {
                    "name": func.get("name", ""),
                    "description": func.get("description", ""),
                    "input_schema": func.get("parameters", {}),
                }
            )

        # Extract system message and convert messages
        system_prompt = ""
        anthropic_messages = []
        for msg in messages:
            if msg.get("role") == "system":
                system_prompt = msg.get("content", "")
            else:
                anthropic_messages.append(
                    {"role": msg.get("role", "user"), "content": msg.get("content", "")}
                )

        try:
            response = client.messages.create(
                model=model_id,
                max_tokens=self._config.max_tokens,
                system=system_prompt if system_prompt else anthropic.NOT_GIVEN,
                messages=anthropic_messages,
                tools=anthropic_tools if anthropic_tools else anthropic.NOT_GIVEN,
            )
        except anthropic.APIError as e:
            logger.error("Anthropic API error (%s): %s", model_id, e)
            raise

        # Parse response
        content = ""
        tool_calls: list[ToolCall] = []
        stop_reason = response.stop_reason

        for block in response.content:
            if block.type == "text":
                content = block.text
            elif block.type == "tool_use":
                tool_calls.append(
                    ToolCall(
                        id=block.id,
                        name=block.name,
                        arguments=block.input if isinstance(block.input, dict) else {},
                    )
                )

        return ChatResponse(
            content=content or None,
            tool_calls=tool_calls,
            finish_reason=stop_reason,
            model=response.model,
            usage=(
                {
                    "prompt_tokens": response.usage.input_tokens,
                    "completion_tokens": response.usage.output_tokens,
                    "total_tokens": response.usage.input_tokens
                    + response.usage.output_tokens,
                }
                if response.usage
                else None
            ),
        )


# ---------------------------------------------------------------------------
#  Provider factory
# ---------------------------------------------------------------------------

_PROVIDERS: dict[str, type] = {
    "deepseek": DeepseekProvider,
    "anthropic": AnthropicProvider,
    "ollama": OllamaProvider,
    "openai": OpenAIProvider,
}


def create_provider(config: LLMProviderConfig) -> LLMProvider:
    """Instantiate an LLMProvider from config.

    Raises:
        ValueError: If the provider name is unknown.
    """
    provider_cls = _PROVIDERS.get(config.provider)
    if provider_cls is None:
        raise ValueError(
            f"Unknown LLM provider: '{config.provider}'. "
            f"Available: {', '.join(sorted(_PROVIDERS))}"
        )
    return provider_cls(config)  # type: ignore[return-value]
