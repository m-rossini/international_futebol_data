"""Shared fixtures for integration tests.

Constants and assertion helpers are in ``helpers.py`` — import from there in test files.
"""

import os
import sys

# Ensure the football_stats/ package directory is on sys.path so that
# `from stats.state import DataState` (etc.) work inside server.py.
_src = os.path.join(os.path.dirname(__file__), "..", "football_stats")
if _src not in sys.path:
    sys.path.insert(0, os.path.abspath(_src))

import pytest
from fastapi.testclient import TestClient

from football_stats.server import app

# Re-export helpers for convenience (pytest auto-loads conftest, not helpers)
from .helpers import (  # noqa: E402, F401
    _ACCENTED_TEAM,
    _ACCENTED_TEAM_FLAT,
    _ADVANCED_STAT_KEYS,
    _KNOWN_CITY,
    _KNOWN_CITY_LOWER,
    _KNOWN_COUNTRY,
    _KNOWN_COUNTRY_LOWER,
    _KNOWN_TEAM,
    _KNOWN_TEAM_LOWER,
    _KNOWN_TEAM_MIXED,
    _KNOWN_TEAM2,
    _KNOWN_TOURNAMENT,
    _STAT_TO_RESPONSE_KEY,
    _assert_keys,
    _assert_series_stats,
    _assert_status,
)


# ---------------------------------------------------------------------------
#  Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient with lifespan triggered (data loaded automatically)."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
