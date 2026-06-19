"""Tests for POST /reload endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status


class TestReload:
    def test_reload_ok(self, client: TestClient):
        resp = client.post("/reload")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"message", "matches_loaded", "goalscorers_loaded",
                             "shootouts_loaded", "former_names_loaded"}, "reload")
        assert body["matches_loaded"] > 0
        assert body["goalscorers_loaded"] > 0
