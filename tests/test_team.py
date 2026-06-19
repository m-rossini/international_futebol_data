"""Tests for GET /team/{team_name} endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import (
    _ACCENTED_TEAM,
    _ACCENTED_TEAM_FLAT,
    _KNOWN_TEAM,
    _KNOWN_TEAM_LOWER,
    _KNOWN_TEAM_MIXED,
    _assert_keys,
    _assert_series_stats,
    _assert_status,
)


class TestTeam:
    def test_team_known(self, client: TestClient):
        resp = client.get(f"/team/{_KNOWN_TEAM}")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"team", "matches_played", "wins", "draws", "losses", "win_rate"}, "team")
        assert body["team"] == _KNOWN_TEAM

    def test_team_case_insensitive_lower(self, client: TestClient):
        resp = client.get(f"/team/{_KNOWN_TEAM_LOWER}")
        _assert_status(resp)
        assert resp.json()["team"] == _KNOWN_TEAM

    def test_team_case_insensitive_mixed(self, client: TestClient):
        resp = client.get(f"/team/{_KNOWN_TEAM_MIXED}")
        _assert_status(resp)
        assert resp.json()["team"] == _KNOWN_TEAM

    def test_team_accent_insensitive(self, client: TestClient):
        """Team with accent can be queried without accents."""
        resp = client.get(f"/team/{_ACCENTED_TEAM_FLAT}")
        _assert_status(resp)
        assert resp.json()["team"] == _ACCENTED_TEAM

    def test_team_unknown(self, client: TestClient):
        resp = client.get("/team/NonExistentTeamXXX")
        _assert_status(resp, 200)
        body = resp.json()
        assert body.get("error") is True
        assert "message" in body

    def test_team_types(self, client: TestClient):
        resp = client.get(f"/team/{_KNOWN_TEAM}")
        body = resp.json()
        assert isinstance(body["matches_played"], int)
        assert isinstance(body["wins"], int)
        assert isinstance(body["draws"], int)
        assert isinstance(body["losses"], int)
        assert isinstance(body["win_rate"], (int, float))

    def test_team_advanced_goal_stats(self, client: TestClient):
        """Team endpoint returns goals_for_stats, goals_against_stats, goal_diff_stats."""
        resp = client.get(f"/team/{_KNOWN_TEAM}")
        body = resp.json()
        _assert_keys(body, {"goals_for_stats", "goals_against_stats", "goal_diff_stats"}, "team.advanced")
        _assert_series_stats(body["goals_for_stats"], "team.goals_for")
        _assert_series_stats(body["goals_against_stats"], "team.goals_against")
        _assert_series_stats(body["goal_diff_stats"], "team.goal_diff")
