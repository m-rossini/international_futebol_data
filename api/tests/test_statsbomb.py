"""Tests for GET /statsbomb/events endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status


class TestStatsBomb:
    def test_statsbomb_events(self, client: TestClient):
        resp = client.get("/statsbomb/events")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(
            body,
            {"matches_with_events", "total_events", "shots"},
            "statsbomb.events",
        )
        assert isinstance(body["matches_with_events"], int)
        assert isinstance(body["total_events"], int)
        assert isinstance(body["shots"], int)

    def test_statsbomb_shots_no_data(self, client: TestClient):
        resp = client.get("/statsbomb/shots/nonexistent-match-id")
        _assert_status(resp, 200)
        assert resp.json().get("error") is True
