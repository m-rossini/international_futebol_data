"""Tests for GET /city/{city_name} endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import (
    _KNOWN_CITY,
    _KNOWN_CITY_LOWER,
    _KNOWN_TOURNAMENT,
    _assert_keys,
    _assert_status,
)


class TestCity:
    def test_city_known(self, client: TestClient):
        resp = client.get(f"/city/{_KNOWN_CITY}")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"city", "country", "summary"}, "city")

    def test_city_case_insensitive(self, client: TestClient):
        resp = client.get(f"/city/{_KNOWN_CITY_LOWER}")
        _assert_status(resp)
        assert resp.json()["city"] == _KNOWN_CITY

    def test_city_summary_keys(self, client: TestClient):
        resp = client.get(f"/city/{_KNOWN_CITY}")
        s = resp.json()["summary"]
        _assert_keys(
            s,
            {
                "matches",
                "first_year",
                "last_year",
                "total_goals",
                "avg_goals_per_match",
                "home_wins",
                "away_wins",
                "draws",
                "unique_teams",
                "unique_tournaments",
                "biggest_win",
                "top_teams_by_wins",
                "top_tournaments",
            },
            "city.summary",
        )

    def test_city_summary_types(self, client: TestClient):
        resp = client.get(f"/city/{_KNOWN_CITY}")
        s = resp.json()["summary"]
        assert isinstance(s["matches"], int)
        assert isinstance(s["total_goals"], int)
        assert isinstance(s["avg_goals_per_match"], float)
        assert isinstance(s["first_year"], int)
        assert isinstance(s["unique_teams"], int)
        assert isinstance(s["unique_tournaments"], int)

    def test_city_biggest_win_shape(self, client: TestClient):
        resp = client.get(f"/city/{_KNOWN_CITY}")
        bw = resp.json()["summary"]["biggest_win"]
        assert bw is not None
        _assert_keys(
            bw,
            {
                "date",
                "home_team",
                "away_team",
                "home_score",
                "away_score",
                "tournament",
            },
            "city.biggest_win",
        )

    def test_city_top_teams_shape(self, client: TestClient):
        resp = client.get(f"/city/{_KNOWN_CITY}")
        teams = resp.json()["summary"]["top_teams_by_wins"]
        assert len(teams) > 0
        _assert_keys(teams[0], {"team", "value"}, "city.top_teams")

    def test_city_unknown(self, client: TestClient):
        resp = client.get("/city/NonExistentCityXXX")
        _assert_status(resp, 200)
        assert resp.json().get("error") is True

    # ------------------------------------------------------------------
    #  Filter tests
    # ------------------------------------------------------------------

    def test_filter_tournament_reduces_matches(self, client: TestClient):
        full = client.get(f"/city/{_KNOWN_CITY}").json()
        filt = client.get(f"/city/{_KNOWN_CITY}?tournaments={_KNOWN_TOURNAMENT}").json()
        assert 0 < filt["summary"]["matches"] < full["summary"]["matches"]

    def test_filter_country_mismatch_returns_error(self, client: TestClient):
        """City in one country filtered by another country returns error (zero matches)."""
        # London is in England; filtering by "Brazil" returns no matches
        resp = client.get(f"/city/{_KNOWN_CITY}?countries=Brazil").json()
        assert resp.get("error") is True

    def test_filter_date_range_reduces_matches(self, client: TestClient):
        full = client.get(f"/city/{_KNOWN_CITY}").json()
        filt = client.get(
            f"/city/{_KNOWN_CITY}?date_from=2000-01-01&date_to=2020-12-31"
        ).json()
        assert 0 < filt["summary"]["matches"] < full["summary"]["matches"]

    def test_filter_nonexistent_tournament_returns_error(self, client: TestClient):
        resp = client.get(
            f"/city/{_KNOWN_CITY}?tournaments=NonExistentTournamentXYZ"
        ).json()
        assert resp.get("error") is True

    def test_filter_date_from_after_date_to_returns_error(self, client: TestClient):
        resp = client.get(
            f"/city/{_KNOWN_CITY}?date_from=2020-01-01&date_to=2010-01-01"
        ).json()
        assert resp.get("error") is True
