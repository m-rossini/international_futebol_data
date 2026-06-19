"""Tests for GET /health endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status


class TestHealth:
    def test_health_exists(self, client: TestClient):
        resp = client.get("/health")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"status", "data_loaded"}, "health")
        assert body["status"] == "ok"
        assert body["data_loaded"] is True
