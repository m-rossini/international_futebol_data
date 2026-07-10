"""Unit tests for LLM config: system_prompt coercion (string vs list of lines)."""

import json

from football_stats.llm.config import LLMConfig, _coerce_prompt


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


class TestSystemPromptLoading:
    """LLMConfig.from_file accepts system_prompt as string or list."""

    def test_string_prompt_unchanged(self, tmp_path):
        path = _write_config(
            tmp_path,
            {
                "llm": {
                    "primary": {"provider": "ollama", "model": "llama3.1"},
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
                    "primary": {"provider": "ollama", "model": "llama3.1"},
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
                    "primary": {"provider": "ollama", "model": "llama3.1"},
                }
            },
        )
        cfg = LLMConfig.from_file(path)
        assert cfg.system_prompt == LLMConfig.system_prompt
