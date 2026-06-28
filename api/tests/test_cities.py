"""Tests for GET /cities endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import (
    _KNOWN_TOURNAMENT,
    _KNOWN_COUNTRY,
    _assert_keys,
    _assert_status,
)


class TestCities:
    def test_cities_exists(self, client: TestClient):
        resp = client.get("/cities")
        _assert_status(resp)
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_cities_shape(self, client: TestClient):
        resp = client.get("/cities")
        item = resp.json()[0]
        _assert_keys(
            item,
            {
                "city",
                "country",
                "matches",
                "total_goals",
                "home_wins",
                "away_wins",
                "draws",
                "unique_teams",
                "tournaments",
                "first_year",
                "last_year",
                "avg_goals",
            },
            "cities.item",
        )

    def test_cities_types(self, client: TestClient):
        resp = client.get("/cities")
        item = resp.json()[0]
        assert isinstance(item["city"], str)
        assert isinstance(item["country"], str)
        assert isinstance(item["matches"], int)
        assert isinstance(item["total_goals"], int)
        assert isinstance(item["avg_goals"], float)
        assert isinstance(item["first_year"], int)

    def test_cities_sorted_desc_by_matches(self, client: TestClient):
        resp = client.get("/cities")
        data = resp.json()
        matches = [c["matches"] for c in data]
        for i in range(len(matches) - 1):
            assert matches[i] >= matches[i + 1]

    # ------------------------------------------------------------------
    #  Filter tests
    # ------------------------------------------------------------------

    def test_filter_tournament_reduces_results(self, client: TestClient):
        full = client.get("/cities").json()
        filt = client.get(f"/cities?tournaments={_KNOWN_TOURNAMENT}").json()
        assert 0 < len(filt) < len(full)

    def test_filter_country_reduces_results(self, client: TestClient):
        full = client.get("/cities").json()
        filt = client.get(f"/cities?countries={_KNOWN_COUNTRY}").json()
        assert 0 < len(filt) < len(full)

    def test_filter_date_range_reduces_results(self, client: TestClient):
        full = client.get("/cities").json()
        filt = client.get("/cities?date_from=2000-01-01&date_to=2020-12-31").json()
        assert 0 < len(filt) < len(full)

    def test_filter_nonexistent_tournament_returns_empty(self, client: TestClient):
        resp = client.get("/cities?tournaments=NonExistentTournamentXYZ").json()
        assert resp == []

    def test_filter_date_from_after_date_to_returns_empty(self, client: TestClient):
        resp = client.get("/cities?date_from=2020-01-01&date_to=2010-01-01").json()
        assert resp == []
