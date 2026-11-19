"""Unit tests for provider SDK timeout wiring and chain failover on timeout."""

import asyncio
import sys
import types
from types import SimpleNamespace

import pytest

from football_stats.llm.chain import ProviderChain
from football_stats.llm.config import LLMConfig, LLMProfileConfig
from football_stats.llm.providers import (
    AnthropicProvider,
    ChatResponse,
    OllamaProvider,
)


def _canned_openai_response(text="hello"):
    return SimpleNamespace(
        choices=[
            SimpleNamespace(
                message=SimpleNamespace(content=text, tool_calls=None),
                finish_reason="stop",
            )
        ],
        model="test-model",
        usage=SimpleNamespace(prompt_tokens=1, completion_tokens=1, total_tokens=2),
    )


def _install_openai_stub(monkeypatch):
    """Replace the `openai` module.

    Returns (created_kwargs, stub_module, state) where ``state["impl"]``
    is the ``create()`` implementation and can be swapped per test.
    """
    created = {}
    state = {"impl": lambda kwargs: _canned_openai_response()}

    class FakeCompletions:
        def create(self, **kwargs):
            return state["impl"](kwargs)

    class FakeOpenAI:
        def __init__(self, **kwargs):
            created.update(kwargs)
            self.chat = SimpleNamespace(completions=FakeCompletions())

    stub = types.ModuleType("openai")
    stub.OpenAI = FakeOpenAI
    stub.APIError = type("APIError", (Exception,), {})
    stub.APITimeoutError = type("APITimeoutError", (stub.APIError,), {})
    monkeypatch.setitem(sys.modules, "openai", stub)
    return created, stub, state


def _install_anthropic_stub(monkeypatch, create_impl):
    created = {}

    class FakeMessages:
        def create(self, **kwargs):
            return create_impl(kwargs)

    class FakeAnthropic:
        def __init__(self, **kwargs):
            created.update(kwargs)
            self.messages = FakeMessages()

    stub = types.ModuleType("anthropic")
    stub.Anthropic = FakeAnthropic
    stub.APIError = type("APIError", (Exception,), {})
    stub.NOT_GIVEN = object()
    monkeypatch.setitem(sys.modules, "anthropic", stub)
    return created


def _profile(**overrides):
    kwargs = {"provider": "ollama", "model": "llama3.1"}
    kwargs.update(overrides)
    return LLMProfileConfig(**kwargs)


class TestProviderTimeoutWiring:
    def test_openai_timeout_passed_to_sdk(self, monkeypatch):
        created, _, _ = _install_openai_stub(monkeypatch)
        provider = OllamaProvider(_profile(timeout_seconds=23))
        resp = asyncio.run(provider.chat_with_tools([], []))
        assert created["timeout"] == 23
        assert resp.content == "hello"

    def test_openai_default_timeout(self, monkeypatch):
        created, _, _ = _install_openai_stub(monkeypatch)
        provider = OllamaProvider(_profile())
        asyncio.run(provider.chat_with_tools([], []))
        assert created["timeout"] == 60.0

    def test_openai_timeout_error_propagates(self, monkeypatch):
        _, stub, state = _install_openai_stub(monkeypatch)

        def _fail(kwargs):
            raise stub.APITimeoutError("timed out")

        state["impl"] = _fail
        provider = OllamaProvider(_profile(timeout_seconds=5))
        with pytest.raises(Exception, match="timed out"):
            asyncio.run(provider.chat_with_tools([], []))

    def test_anthropic_timeout_passed_to_sdk(self, monkeypatch):
        created = _install_anthropic_stub(
            monkeypatch,
            lambda kwargs: SimpleNamespace(
                content=[SimpleNamespace(type="text", text="hi")],
                stop_reason="end_turn",
                model="test-model",
                usage=SimpleNamespace(input_tokens=1, output_tokens=1),
            ),
        )
        provider = AnthropicProvider(_profile(timeout_seconds=42))
        resp = asyncio.run(provider.chat_with_tools([], []))
        assert created["timeout"] == 42
        assert resp.content == "hi"


class _FakeProvider:
    """Duck-typed provider returning a fixed response or raising."""

    def __init__(self, behaviour):
        self._behaviour = behaviour
        self.calls = 0

    async def chat_with_tools(self, messages, tools, model=None):
        self.calls += 1
        if isinstance(self._behaviour, Exception):
            raise self._behaviour
        return self._behaviour


class TestChainFailoverOnTimeout:
    def _chain(self, *providers):
        chain = ProviderChain(LLMConfig(profiles={}))
        chain._providers = list(providers)
        return chain

    def test_timeout_fails_over_to_next_profile(self):
        slow = _FakeProvider(TimeoutError("timed out after 60s"))
        fast = _FakeProvider(ChatResponse(content="ok"))
        chain = self._chain(("slow", slow), ("fast", fast))
        result = asyncio.run(chain.chat_with_tools([], []))
        assert result.content == "ok"

    def test_all_timeouts_raise(self):
        chain = self._chain(
            ("a", _FakeProvider(TimeoutError("a timed out"))),
            ("b", _FakeProvider(TimeoutError("b timed out"))),
        )
        with pytest.raises(RuntimeError, match="All LLM profiles failed"):
            asyncio.run(chain.chat_with_tools([], []))


class TestChainCooldown:
    def _chain(self, *providers, **kwargs):
        chain = ProviderChain(LLMConfig(profiles={}), **kwargs)
        chain._providers = list(providers)
        return chain

    def test_failed_profile_skipped_on_next_call(self):
        slow = _FakeProvider(TimeoutError("timed out"))
        fast = _FakeProvider(ChatResponse(content="ok"))
        chain = self._chain(("slow", slow), ("fast", fast))
        assert asyncio.run(chain.chat_with_tools([], [])).content == "ok"
        assert (slow.calls, fast.calls) == (1, 1)
        # Second call goes straight to the healthy profile.
        assert asyncio.run(chain.chat_with_tools([], [])).content == "ok"
        assert (slow.calls, fast.calls) == (1, 2)

    def test_all_cooling_down_still_tried(self):
        slow = _FakeProvider(TimeoutError("slow timed out"))
        slower = _FakeProvider(TimeoutError("slower timed out"))
        chain = self._chain(("slow", slow), ("slower", slower))
        with pytest.raises(RuntimeError, match="All LLM profiles failed"):
            asyncio.run(chain.chat_with_tools([], []))
        # Both cooling down, but a new call tries anyway rather than refusing.
        with pytest.raises(RuntimeError, match="All LLM profiles failed"):
            asyncio.run(chain.chat_with_tools([], []))
        assert (slow.calls, slower.calls) == (2, 2)

    def test_cooldown_expires(self):
        import time as _time

        slow = _FakeProvider(TimeoutError("timed out"))
        fast = _FakeProvider(ChatResponse(content="ok"))
        chain = self._chain(("slow", slow), ("fast", fast), cooldown_seconds=0.05)
        asyncio.run(chain.chat_with_tools([], []))
        assert slow.calls == 1
        _time.sleep(0.06)
        asyncio.run(chain.chat_with_tools([], []))
        assert slow.calls == 2

    def test_rebuild_clears_cooldowns(self):
        slow = _FakeProvider(TimeoutError("timed out"))
        fast = _FakeProvider(ChatResponse(content="ok"))
        chain = self._chain(("slow", slow), ("fast", fast))
        asyncio.run(chain.chat_with_tools([], []))
        assert slow.calls == 1
        chain.rebuild(LLMConfig(profiles={}))
        chain._providers = [("slow", slow), ("fast", fast)]
        asyncio.run(chain.chat_with_tools([], []))
        assert slow.calls == 2
