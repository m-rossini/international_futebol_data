"""Tests for GET /version endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status


class TestVersion:
    def test_version_exists(self, client: TestClient):
        resp = client.get("/version")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"version"}, "version")
        assert isinstance(body["version"], str)
        assert len(body["version"]) > 0

    def test_version_semver(self, client: TestClient):
        """Version should follow semver-like pattern (e.g. 1.0.1)."""
        resp = client.get("/version")
        v = resp.json()["version"]
        parts = v.split(".")
        assert len(parts) == 3, f"Version '{v}' is not semver (expected X.Y.Z)"
        for p in parts:
            assert p.isdigit(), f"Version segment '{p}' is not numeric"
