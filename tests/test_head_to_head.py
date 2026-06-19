"""Tests for GET /head_to_head endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import (
    _KNOWN_TEAM,
    _KNOWN_TEAM_LOWER,
    _KNOWN_TEAM2,
    _assert_keys,
    _assert_series_stats,
    _assert_status,
)


class TestHeadToHead:
    def test_h2h_known(self, client: TestClient):
        resp = client.get(f"/head_to_head?team1={_KNOWN_TEAM}&team2={_KNOWN_TEAM2}")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"team1", "team2", "matches", "draws",
                             f"{_KNOWN_TEAM}_wins", f"{_KNOWN_TEAM2}_wins",
                             f"{_KNOWN_TEAM}_goals", f"{_KNOWN_TEAM2}_goals"}, "h2h")

    def test_h2h_case_insensitive(self, client: TestClient):
        resp = client.get(f"/head_to_head?team1={_KNOWN_TEAM_LOWER}&team2={_KNOWN_TEAM2.upper()}")
        _assert_status(resp)
        body = resp.json()
        assert body["team1"] == _KNOWN_TEAM
        assert body["team2"] == _KNOWN_TEAM2

    def test_h2h_unknown_team(self, client: TestClient):
        resp = client.get("/head_to_head?team1=DoesNotExist&team2=AlsoFake")
        _assert_status(resp, 200)
        assert resp.json().get("error") is True

    def test_h2h_types(self, client: TestClient):
        resp = client.get(f"/head_to_head?team1={_KNOWN_TEAM}&team2={_KNOWN_TEAM2}")
        body = resp.json()
        assert isinstance(body["matches"], int)
        assert isinstance(body["draws"], int)
        assert isinstance(body[f"{_KNOWN_TEAM}_wins"], int)
        assert isinstance(body[f"{_KNOWN_TEAM}_goals"], int)

    def test_h2h_advanced_goal_stats(self, client: TestClient):
        """Head-to-head returns total_goals_per_match_stats with full series_stats."""
        resp = client.get(f"/head_to_head?team1={_KNOWN_TEAM}&team2={_KNOWN_TEAM2}")
        body = resp.json()
        _assert_keys(body, {"total_goals_per_match_stats"}, "h2h.advanced")
        _assert_series_stats(body["total_goals_per_match_stats"], "h2h.goals_per_match")
