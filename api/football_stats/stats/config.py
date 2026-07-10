"""Configuration loading for the stats package."""

from __future__ import annotations

import json


def load_config(config_path: str) -> dict:
    """Read a JSON config file, returning an empty dict if missing/invalid."""
    try:
        with open(config_path) as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}
