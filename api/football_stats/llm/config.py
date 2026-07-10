"""LLM configuration — dataclasses and loader for the conversation feature."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass
class LLMProviderConfig:
    """Configuration for a single LLM provider."""

    provider: str  # "deepseek" | "anthropic" | "ollama" | "openai"
    model: str
    api_key_env: str | None = None  # env var name holding the API key
    base_url: str | None = None  # override for OpenAI-compatible providers
    max_tokens: int = 4096
    temperature: float = 0.7

    def get_api_key(self) -> str | None:
        """Read the API key from the environment variable."""
        if self.api_key_env is None:
            return None
        return os.environ.get(self.api_key_env)


@dataclass
class LLMConfig:
    """Top-level LLM configuration."""

    primary: LLMProviderConfig | None = None
    fallback: LLMProviderConfig | None = None
    system_prompt: str = (
        "You are a football data analyst assistant with access to 150+ years of "
        "international football match data. You can answer questions about teams, "
        "tournaments, matches, goalscorers, head-to-head records, and more.\n\n"
        "Rules:\n"
        "- Base your answers ONLY on data returned by the tools\n"
        "- If the data doesn't contain the answer, say so clearly\n"
        "- Be concise and factual\n"
        "- Use specific numbers and statistics when available\n"
        "- When comparing teams, use head-to-head data\n"
        "- For historical context, use the year-by-year breakdown"
    )
    max_tool_iterations: int = 5
    conversation_ttl_seconds: int = 3600  # 1 hour

    @classmethod
    def from_file(cls, config_path: str | Path | None = None) -> LLMConfig:
        """Load LLM config from the application config.json.

        Falls back to defaults if the llm section is missing or the file
        doesn't exist.
        """
        if config_path is None:
            config_path = Path(__file__).resolve().parent.parent / "config.json"
        else:
            config_path = Path(config_path)

        try:
            with open(config_path) as f:
                data: dict[str, Any] = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return cls()

        llm_data = data.get("llm")
        if llm_data is None:
            return cls()

        return cls(
            primary=_parse_provider_config(llm_data.get("primary")),
            fallback=_parse_provider_config(llm_data.get("fallback")),
            system_prompt=_coerce_prompt(
                llm_data.get("system_prompt"), cls.system_prompt
            ),
            max_tool_iterations=llm_data.get("max_tool_iterations", 5),
            conversation_ttl_seconds=llm_data.get("conversation_ttl_seconds", 3600),
        )


def _coerce_prompt(value: Any, default: str) -> str:
    """Normalize a system_prompt config value into a string.

    Accepts either a plain string (backward compatible) or a list of
    strings (one per line), which are joined with newlines so the
    prompt can be written readably across multiple config lines.
    """
    if value is None:
        return default
    if isinstance(value, list):
        return "\n".join(str(line) for line in value)
    return str(value)


def _parse_provider_config(data: dict[str, Any] | None) -> LLMProviderConfig | None:
    """Parse a provider config dict, returning None if missing or incomplete."""
    if data is None:
        return None
    provider = data.get("provider")
    model = data.get("model")
    if not provider or not model:
        return None
    return LLMProviderConfig(
        provider=provider,
        model=model,
        api_key_env=data.get("api_key_env"),
        base_url=data.get("base_url"),
        max_tokens=data.get("max_tokens", 4096),
        temperature=data.get("temperature", 0.7),
    )
