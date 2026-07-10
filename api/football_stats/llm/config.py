"""LLM configuration — dataclasses and loader for the conversation feature."""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

DEFAULT_CONFIG_RELATIVE = Path(__file__).resolve().parent.parent / "config.json"


@dataclass
class LLMProfileConfig:
    """Configuration for a single LLM provider profile."""

    provider: str  # "deepseek" | "anthropic" | "ollama" | "openai"
    model: str
    priority: int = 100  # lower = higher priority (tried first)
    api_key_env: str | None = None
    base_url: str | None = None
    max_tokens: int = 4096
    temperature: float = 0.7

    def get_api_key(self) -> str | None:
        """Read the API key from the environment variable."""
        if self.api_key_env is None:
            return None
        return os.environ.get(self.api_key_env)

    def safe_summary(self) -> dict[str, Any]:
        """Return a dict suitable for API responses (no secrets)."""
        return {
            "provider": self.provider,
            "model": self.model,
            "temperature": self.temperature,
            "max_tokens": self.max_tokens,
        }


@dataclass
class LLMConfig:
    """Top-level LLM configuration with named, prioritized profiles."""

    profiles: dict[str, LLMProfileConfig] = field(default_factory=dict)
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
    conversation_ttl_seconds: int = 3600

    @property
    def chain(self) -> list[tuple[str, LLMProfileConfig]]:
        """Profiles sorted by priority (ascending), then name (deterministic)."""
        return sorted(self.profiles.items(), key=lambda x: (x[1].priority, x[0]))

    @property
    def active_profile_name(self) -> str | None:
        """Name of the highest-priority profile (tried first)."""
        c = self.chain
        return c[0][0] if c else None

    @property
    def active_profile(self) -> LLMProfileConfig | None:
        """Highest-priority profile config."""
        c = self.chain
        return c[0][1] if c else None

    @property
    def is_enabled(self) -> bool:
        return len(self.profiles) > 0

    # ------------------------------------------------------------------
    #  Serialization helpers
    # ------------------------------------------------------------------

    def to_llm_dict(self) -> dict[str, Any]:
        """Serialize the LLM section for writing back to config.json."""
        profiles_dict: dict[str, dict[str, Any]] = {}
        for name, p in self.profiles.items():
            profiles_dict[name] = {
                "provider": p.provider,
                "model": p.model,
                "priority": p.priority,
            }
            if p.api_key_env is not None:
                profiles_dict[name]["api_key_env"] = p.api_key_env
            if p.base_url is not None:
                profiles_dict[name]["base_url"] = p.base_url
            profiles_dict[name]["max_tokens"] = p.max_tokens
            profiles_dict[name]["temperature"] = p.temperature

        return {
            "profiles": profiles_dict,
            "system_prompt": self.system_prompt.split("\n"),
            "max_tool_iterations": self.max_tool_iterations,
            "conversation_ttl_seconds": self.conversation_ttl_seconds,
        }

    def promote_profile(self, name: str) -> None:
        """Make *name* the highest-priority profile (1), shifting others down.

        Raises KeyError if *name* is not in self.profiles.
        """
        if name not in self.profiles:
            raise KeyError(name)

        target = self.profiles[name]
        target_priority = target.priority
        for p in self.profiles.values():
            if p.priority <= target_priority:
                p.priority += 1
        target.priority = 1

    # ------------------------------------------------------------------
    #  Class methods for loading / saving whole config files
    # ------------------------------------------------------------------

    @classmethod
    def from_file(cls, config_path: str | Path | None = None) -> LLMConfig:
        """Load LLM config from the application config.json."""
        if config_path is None:
            config_path = DEFAULT_CONFIG_RELATIVE
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

        profiles: dict[str, LLMProfileConfig] = {}
        raw_profiles = llm_data.get("profiles", {})
        for name, pdict in raw_profiles.items():
            parsed = _parse_provider_config(pdict)
            if parsed is not None:
                profiles[str(name)] = parsed

        return cls(
            profiles=profiles,
            system_prompt=_coerce_prompt(
                llm_data.get("system_prompt"), cls.system_prompt
            ),
            max_tool_iterations=llm_data.get("max_tool_iterations", 5),
            conversation_ttl_seconds=llm_data.get("conversation_ttl_seconds", 3600),
        )

    @classmethod
    def load_full_config(cls, config_path: str | Path | None = None) -> dict[str, Any]:
        """Read the entire config.json as a raw dict."""
        if config_path is None:
            config_path = DEFAULT_CONFIG_RELATIVE
        else:
            config_path = Path(config_path)
        with open(config_path) as f:
            return json.load(f)

    @classmethod
    def save_llm_section(
        cls,
        llm_config: LLMConfig,
        config_path: str | Path | None = None,
    ) -> None:
        """Write the LLM section back into config.json, preserving everything else."""
        if config_path is None:
            config_path = DEFAULT_CONFIG_RELATIVE
        else:
            config_path = Path(config_path)

        full = cls.load_full_config(config_path)
        full["llm"] = llm_config.to_llm_dict()
        with open(config_path, "w") as f:
            json.dump(full, f, indent=2)
        f.close()  # Ensure flush


# ---------------------------------------------------------------------------
#  Module-level helpers
# ---------------------------------------------------------------------------


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


def _parse_provider_config(data: dict[str, Any] | None) -> LLMProfileConfig | None:
    """Parse a provider profile dict, returning None if missing or incomplete."""
    if data is None:
        return None
    provider = data.get("provider")
    model = data.get("model")
    if not provider or not model:
        return None
    return LLMProfileConfig(
        provider=provider,
        model=model,
        priority=data.get("priority", 100),
        api_key_env=data.get("api_key_env"),
        base_url=data.get("base_url"),
        max_tokens=data.get("max_tokens", 4096),
        temperature=data.get("temperature", 0.7),
    )
