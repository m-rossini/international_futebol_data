"""Tests for GET /shot_maps/events endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status


class TestShotMaps:
    def test_shot_maps_events(self, client: TestClient):
        resp = client.get("/shot_maps/events")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(
            body,
            {"matches_with_events", "total_events", "shots"},
            "shot_maps.events",
        )
        assert isinstance(body["matches_with_events"], int)
        assert isinstance(body["total_events"], int)
        assert isinstance(body["shots"], int)

    def test_shot_maps_shots_no_data(self, client: TestClient):
        resp = client.get("/shot_maps/shots/nonexistent-match-id")
        _assert_status(resp, 200)
        assert resp.json().get("error") is True
