# Plan: Add Free LLM Providers with Auto-Failover

## Context

The user wants to use free LLM models as the primary option, with automatic cycling between providers when one hits quota limits. The project already has a `ProviderChain` in `chain.py` that tries profiles in priority order and falls through on failure — this is exactly the cycling behavior needed.

## What Needs to Change

### 1. Add 3 new providers to `api/football_stats/llm/providers.py`

All three are OpenAI-compatible, so they extend `OpenAICompatibleProvider`:

```python
class OpenRouterProvider(OpenAICompatibleProvider):
    """OpenRouter aggregator (OpenAI-compatible)."""
    provider_name = "openrouter"

    def __init__(self, config: LLMProfileConfig):
        super().__init__(config)
        if not self._config.base_url:
            self._config.base_url = "https://openrouter.ai/api/v1"

    def _resolve_model(self, model_override: str | None) -> str:
        return model_override or self._config.model


class CerebrasProvider(OpenAICompatibleProvider):
    """Cerebras ultra-fast inference (OpenAI-compatible)."""
    provider_name = "cerebras"

    def __init__(self, config: LLMProfileConfig):
        super().__init__(config)
        if not self._config.base_url:
            self._config.base_url = "https://api.cerebras.ai/v1"

    def _resolve_model(self, model_override: str | None) -> str:
        return model_override or self._config.model


class GitHubModelsProvider(OpenAICompatibleProvider):
    """GitHub Models (OpenAI-compatible endpoint)."""
    provider_name = "github-models"

    def __init__(self, config: LLMProfileConfig):
        super().__init__(config)
        if not self._config.base_url:
            self._config.base_url = "https://models.inference.ai.azure.com"

    def _resolve_model(self, model_override: str | None) -> str:
        return model_override or self._config.model
```

### 2. Register providers in `_PROVIDERS` dict (same file, line ~298)

```python
_PROVIDERS: dict[str, type] = {
    "deepseek": DeepseekProvider,
    "anthropic": AnthropicProvider,
    "ollama": OllamaProvider,
    "openai": OpenAIProvider,
    "openrouter": OpenRouterProvider,
    "cerebras": CerebrasProvider,
    "github-models": GitHubModelsProvider,
}
```

### 3. Add LLM profiles to `api/config.json`

```json
{
  "version": "1.2.4",
  "llm": {
    "profiles": {
      "openrouter-free": {
        "provider": "openrouter",
        "model": "meta-llama/llama-3.3-70b-instruct:free",
        "priority": 1,
        "api_key_env": "OPENROUTER_API_KEY",
        "base_url": "https://openrouter.ai/api/v1"
      },
      "cerebras-free": {
        "provider": "cerebras",
        "model": "llama-3.3-70b",
        "priority": 2,
        "api_key_env": "CEREBRAS_API_KEY",
        "base_url": "https://api.cerebras.ai/v1"
      },
      "github-models-free": {
        "provider": "github-models",
        "model": "gpt-4o-mini",
        "priority": 3,
        "api_key_env": "GITHUB_TOKEN",
        "base_url": "https://models.inference.ai.azure.com"
      }
    },
    "max_tool_iterations": 5
  }
}
```

### 4. How failover works (already built-in)

In `chain.py:83-110`:
```python
async def chat_with_tools(self, messages, tools, model=None):
    errors = []
    for name, provider in self._providers:  # sorted by priority
        try:
            return await provider.chat_with_tools(messages, tools, model)
        except Exception as e:
            logger.warning("Profile '%s' failed: %s", name, e)
            errors.append(f"{name}: {e}")
    raise RuntimeError("All LLM profiles failed...")
```

When OpenRouter returns 429 (quota exhausted), the exception is caught, logged, and it falls through to Cerebras. If Cerebras fails, it falls through to GitHub Models.

### 5. Environment variables needed

```bash
export OPENROUTER_API_KEY=sk-or-v1-...
export CEREBRAS_API_KEY=csk-...
export GITHUB_TOKEN=ghp_...
```

### 6. Update `opencode.json` for dev tool (optional)

Add provider configs for opencode's model picker:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "openrouter": {
      "whitelist": [
        "openrouter/free",
        "meta-llama/llama-4-maverick:free",
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-r1-zero:free",
        "nvidia/nemotron-3-super:free",
        "qwen/qwen3-coder:free"
      ]
    },
    "cerebras": {
      "whitelist": ["llama-3.3-70b", "qwen-3-coder-480b"]
    }
  }
}
```

## Files to modify

1. `api/football_stats/llm/providers.py` — add 3 provider classes + register
2. `api/config.json` — add LLM profiles section
3. `opencode.json` (root) — add provider configs for dev tool

## Verification

1. Run existing tests: `cd api && python -m pytest tests/test_llm_config.py -v`
2. Add test for new providers in `tests/test_llm_config.py`
3. Manual test: start server, hit `/conversation` endpoint, verify failover by mocking quota errors
