"""Shared fixtures for integration tests."""

import pytest
from fastapi.testclient import TestClient

from football_stats.server import app


@pytest.fixture(scope="session")
def client():
    """FastAPI TestClient with lifespan triggered (data loaded automatically)."""
    with TestClient(app, raise_server_exceptions=False) as c:
        yield c
