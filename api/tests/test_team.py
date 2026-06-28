"""Tests for GET /team/{team_name} endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import (
    _ACCENTED_TEAM,
    _ACCENTED_TEAM_FLAT,
    _KNOWN_TEAM,
    _KNOWN_TEAM_LOWER,
    _KNOWN_TEAM_MIXED,
    _KNOWN_TOURNAMENT,
    _KNOWN_COUNTRY,
    _assert_keys,
    _assert_series_stats,
    _assert_status,
)


class TestTeam:
    # ------------------------------------------------------------------
    #  Basic resolution & shape
    # ------------------------------------------------------------------
    def test_team_known(self, client: TestClient):
        resp = client.get(f"/team/{_KNOWN_TEAM}")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(
            body,
            {"team", "matches_played", "wins", "draws", "losses", "win_rate"},
            "team",
        )
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
        _assert_keys(
            body,
            {"goals_for_stats", "goals_against_stats", "goal_diff_stats"},
            "team.advanced",
        )
        _assert_series_stats(body["goals_for_stats"], "team.goals_for")
        _assert_series_stats(body["goals_against_stats"], "team.goals_against")
        _assert_series_stats(body["goal_diff_stats"], "team.goal_diff")

    # ------------------------------------------------------------------
    #  Filter tests
    # ------------------------------------------------------------------

    def test_filter_tournament_reduces_matches(self, client: TestClient):
        full = client.get(f"/team/{_KNOWN_TEAM}").json()
        filt = client.get(f"/team/{_KNOWN_TEAM}?tournaments={_KNOWN_TOURNAMENT}").json()
        assert filt["matches_played"] < full["matches_played"]
        assert filt["matches_played"] > 0

    def test_filter_country_reduces_matches(self, client: TestClient):
        full = client.get(f"/team/{_KNOWN_TEAM}").json()
        filt = client.get(f"/team/{_KNOWN_TEAM}?countries={_KNOWN_COUNTRY}").json()
        assert filt["matches_played"] < full["matches_played"]

    def test_filter_date_range_reduces_matches(self, client: TestClient):
        full = client.get(f"/team/{_KNOWN_TEAM}").json()
        filt = client.get(
            f"/team/{_KNOWN_TEAM}?date_from=2000-01-01&date_to=2020-12-31"
        ).json()
        assert filt["matches_played"] < full["matches_played"]
        assert filt["matches_played"] > 0

    def test_filter_nonexistent_tournament_returns_zero(self, client: TestClient):
        resp = client.get(
            f"/team/{_KNOWN_TEAM}?tournaments=NonExistentTournamentXYZ"
        ).json()
        assert resp["matches_played"] == 0

    def test_filter_date_from_after_date_to_returns_zero(self, client: TestClient):
        resp = client.get(
            f"/team/{_KNOWN_TEAM}?date_from=2020-01-01&date_to=2010-01-01"
        ).json()
        assert resp["matches_played"] == 0
