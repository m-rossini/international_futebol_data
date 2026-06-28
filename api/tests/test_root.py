"""Tests for GET / endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status


class TestRoot:
    def test_root_exists(self, client: TestClient):
        resp = client.get("/")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(
            body, {"service", "status", "version", "endpoints", "data_loaded"}, "root"
        )

    def test_root_keys(self, client: TestClient):
        resp = client.get("/")
        body = resp.json()
        assert body["service"] == "International Football Stats"
        assert body["status"] == "running"
        assert isinstance(body["version"], str)
        assert len(body["version"]) > 0
        assert isinstance(body["endpoints"], dict)
        assert isinstance(body["data_loaded"], bool)
        assert body["data_loaded"] is True

    def test_root_filter_params_documented(self, client: TestClient):
        """Root endpoint documents the available filter parameters."""
        body = client.get("/").json()
        fp = body["filter_params"]
        _assert_keys(fp, {"tournaments", "countries", "cities", "teams"})
