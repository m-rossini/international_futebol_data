"""Tests for GET /tournament/{tournament_name} endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _KNOWN_TOURNAMENT, _KNOWN_COUNTRY, _assert_keys, _assert_status


class TestTournament:
    def test_tournament_known(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"tournament", "summary", "yearly"}, "tournament")

    def test_tournament_summary_keys(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}")
        s = resp.json()["summary"]
        _assert_keys(s, {
            "first_year", "last_year", "editions", "matches", "total_goals",
            "avg_goals_per_match", "home_wins", "away_wins", "draws",
            "unique_teams", "biggest_win", "top_teams_by_wins",
            "top_host_countries", "top_host_cities",
        }, "tournament.summary")

    def test_tournament_yearly_shape(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}")
        yearly = resp.json()["yearly"]
        assert len(yearly) > 0
        _assert_keys(yearly[0], {
            "year", "matches", "goals", "avg_goals",
            "home_wins", "away_wins", "draws", "teams", "host_country",
        }, "tournament.yearly")

    def test_tournament_yearly_types(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}")
        item = resp.json()["yearly"][0]
        assert isinstance(item["year"], int)
        assert isinstance(item["matches"], int)
        assert isinstance(item["goals"], int)
        assert isinstance(item["avg_goals"], float)

    def test_tournament_unknown(self, client: TestClient):
        resp = client.get("/tournament/NonExistentTournamentXXX")
        _assert_status(resp, 200)
        body = resp.json()
        assert body.get("error") is True

    def test_tournament_biggest_win_shape(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}")
        bw = resp.json()["summary"]["biggest_win"]
        assert bw is not None
        _assert_keys(bw, {"date", "home_team", "away_team", "home_score", "away_score"}, "biggest_win")

    def test_tournament_top_teams_shape(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}")
        teams = resp.json()["summary"]["top_teams_by_wins"]
        assert len(teams) > 0
        _assert_keys(teams[0], {"team", "wins"}, "top_teams")
        assert isinstance(teams[0]["wins"], int)

    # ------------------------------------------------------------------
    #  Filter tests
    # ------------------------------------------------------------------

    def test_filter_country_reduces_matches(self, client: TestClient):
        full = client.get(f"/tournament/{_KNOWN_TOURNAMENT}").json()
        filt = client.get(f"/tournament/{_KNOWN_TOURNAMENT}?countries={_KNOWN_COUNTRY}").json()
        assert 0 < filt["summary"]["matches"] < full["summary"]["matches"]

    def test_filter_date_range_reduces_matches(self, client: TestClient):
        full = client.get(f"/tournament/{_KNOWN_TOURNAMENT}").json()
        filt = client.get(f"/tournament/{_KNOWN_TOURNAMENT}?date_from=2000-01-01&date_to=2020-12-31").json()
        assert 0 < filt["summary"]["matches"] < full["summary"]["matches"]

    def test_filter_nonexistent_country_returns_error(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}?countries=NonExistentCountryXYZ").json()
        assert resp.get("error") is True

    def test_filter_date_from_after_date_to_returns_error(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}?date_from=2020-01-01&date_to=2010-01-01").json()
        assert resp.get("error") is True
