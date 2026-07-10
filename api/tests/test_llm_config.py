"""Unit tests for LLM config: priority-based profiles and system_prompt coercion."""

import json

from football_stats.llm.config import LLMConfig, LLMProfileConfig, _coerce_prompt


def _write_config(tmp_path, data):
    path = tmp_path / "config.json"
    path.write_text(json.dumps(data))
    return path


class TestCoercePrompt:
    """_coerce_prompt normalizes string / list / missing prompt values."""

    def test_none_uses_default(self):
        default = "default prompt"
        assert _coerce_prompt(None, default) == default

    def test_string_passthrough(self):
        assert _coerce_prompt("one line", "default") == "one line"

    def test_list_joined_with_newlines(self):
        assert _coerce_prompt(["a", "b", "c"], "default") == "a\nb\nc"

    def test_list_preserves_empty_lines(self):
        assert _coerce_prompt(["a", "", "c"], "default") == "a\n\nc"


class TestProfilesLoading:
    """LLMConfig.from_file parses profiles dict with priorities."""

    def test_single_profile(self, tmp_path):
        path = _write_config(
            tmp_path,
            {
                "llm": {
                    "profiles": {
                        "test-profile": {
                            "provider": "ollama",
                            "model": "llama3.1",
                            "priority": 1,
                        }
                    },
                }
            },
        )
        cfg = LLMConfig.from_file(path)
        assert cfg.is_enabled
        assert cfg.active_profile_name == "test-profile"
        assert cfg.active_profile.provider == "ollama"
        assert cfg.active_profile.model == "llama3.1"
        assert cfg.active_profile.priority == 1

    def test_multiple_profiles_sorted_by_priority(self, tmp_path):
        path = _write_config(
            tmp_path,
            {
                "llm": {
                    "profiles": {
                        "b-profile": {
                            "provider": "openai",
                            "model": "gpt-4",
                            "priority": 3,
                        },
                        "a-profile": {
                            "provider": "deepseek",
                            "model": "deepseek-v4-pro",
                            "priority": 1,
                        },
                        "c-profile": {
                            "provider": "ollama",
                            "model": "llama3.1",
                            "priority": 2,
                        },
                    }
                }
            },
        )
        cfg = LLMConfig.from_file(path)
        chain = cfg.chain
        assert len(chain) == 3
        assert chain[0][0] == "a-profile"
        assert chain[1][0] == "c-profile"
        assert chain[2][0] == "b-profile"
        assert cfg.active_profile_name == "a-profile"

    def test_same_priority_sorted_by_name(self, tmp_path):
        path = _write_config(
            tmp_path,
            {
                "llm": {
                    "profiles": {
                        "z-profile": {
                            "provider": "ollama",
                            "model": "llama3.1",
                            "priority": 1,
                        },
                        "a-profile": {
                            "provider": "ollama",
                            "model": "llama3.1",
                            "priority": 1,
                        },
                    }
                }
            },
        )
        cfg = LLMConfig.from_file(path)
        chain = cfg.chain
        assert chain[0][0] == "a-profile"
        assert chain[1][0] == "z-profile"

    def test_missing_priority_defaults_to_100(self, tmp_path):
        path = _write_config(
            tmp_path,
            {
                "llm": {
                    "profiles": {
                        "low-prio": {
                            "provider": "ollama",
                            "model": "llama3.1",
                        }
                    }
                }
            },
        )
        cfg = LLMConfig.from_file(path)
        assert cfg.active_profile.priority == 100

    def test_empty_profiles_disabled(self, tmp_path):
        path = _write_config(tmp_path, {"llm": {"profiles": {}}})
        cfg = LLMConfig.from_file(path)
        assert not cfg.is_enabled
        assert cfg.active_profile_name is None

    def test_no_llm_section_disabled(self, tmp_path):
        path = _write_config(tmp_path, {})
        cfg = LLMConfig.from_file(path)
        assert not cfg.is_enabled

    def test_incomplete_provider_skipped(self, tmp_path):
        path = _write_config(
            tmp_path,
            {
                "llm": {
                    "profiles": {
                        "bad": {
                            "provider": "",
                            "model": "",
                            "priority": 1,
                        },
                        "good": {
                            "provider": "ollama",
                            "model": "llama3.1",
                            "priority": 2,
                        },
                    }
                }
            },
        )
        cfg = LLMConfig.from_file(path)
        assert len(cfg.profiles) == 1
        assert cfg.active_profile_name == "good"


class TestProfilePromotion:
    """LLMConfig.promote_profile changes priorities to make a profile active."""

    def test_promote_to_top(self):
        cfg = LLMConfig(
            profiles={
                "a": LLMProfileConfig(provider="openai", model="gpt-4", priority=1),
                "b": LLMProfileConfig(provider="ollama", model="llama3.1", priority=2),
                "c": LLMProfileConfig(provider="deepseek", model="ds", priority=3),
            }
        )
        assert cfg.active_profile_name == "a"

        cfg.promote_profile("c")
        assert cfg.profiles["c"].priority == 1
        assert cfg.profiles["a"].priority == 2
        assert cfg.profiles["b"].priority == 3
        assert cfg.active_profile_name == "c"

    def test_promote_already_active(self):
        cfg = LLMConfig(
            profiles={
                "a": LLMProfileConfig(provider="openai", model="gpt-4", priority=1),
            }
        )
        cfg.promote_profile("a")
        assert cfg.profiles["a"].priority == 1

    def test_promote_unknown_raises(self):
        cfg = LLMConfig(
            profiles={
                "a": LLMProfileConfig(provider="openai", model="gpt-4", priority=1),
            }
        )
        try:
            cfg.promote_profile("x")
            assert False, "Expected KeyError"
        except KeyError:
            pass


class TestSafeSummary:
    """LLMProfileConfig.safe_summary excludes secrets."""

    def test_excludes_api_key_env_and_base_url(self):
        cfg = LLMProfileConfig(
            provider="deepseek",
            model="deepseek-v4-pro",
            api_key_env="SECRET",
            base_url="http://secret:1234/v1",
        )
        summary = cfg.safe_summary()
        assert summary == {
            "provider": "deepseek",
            "model": "deepseek-v4-pro",
            "temperature": 0.7,
            "max_tokens": 4096,
        }
        assert "api_key_env" not in summary
        assert "base_url" not in summary


class TestSystemPromptLoading:
    """LLMConfig.from_file accepts system_prompt as string or list."""

    def test_string_prompt_unchanged(self, tmp_path):
        path = _write_config(
            tmp_path,
            {
                "llm": {
                    "profiles": {
                        "p": {"provider": "ollama", "model": "llama3.1", "priority": 1},
                    },
                    "system_prompt": "You are a helpful assistant.",
                }
            },
        )
        cfg = LLMConfig.from_file(path)
        assert cfg.system_prompt == "You are a helpful assistant."

    def test_list_prompt_joined(self, tmp_path):
        path = _write_config(
            tmp_path,
            {
                "llm": {
                    "profiles": {
                        "p": {"provider": "ollama", "model": "llama3.1", "priority": 1},
                    },
                    "system_prompt": [
                        "Line one.",
                        "Line two.",
                        "",
                        "- rule a",
                        "- rule b",
                    ],
                }
            },
        )
        cfg = LLMConfig.from_file(path)
        assert cfg.system_prompt == "Line one.\nLine two.\n\n- rule a\n- rule b"

    def test_missing_prompt_uses_default(self, tmp_path):
        path = _write_config(
            tmp_path,
            {
                "llm": {
                    "profiles": {
                        "p": {"provider": "ollama", "model": "llama3.1", "priority": 1},
                    },
                }
            },
        )
        cfg = LLMConfig.from_file(path)
        assert cfg.system_prompt == LLMConfig.system_prompt
