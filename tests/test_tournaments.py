"""Tests for GET /tournaments endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _KNOWN_COUNTRY, _assert_keys, _assert_status


class TestTournaments:
    def test_tournaments_exists(self, client: TestClient):
        resp = client.get("/tournaments")
        _assert_status(resp)
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_tournaments_shape(self, client: TestClient):
        resp = client.get("/tournaments")
        item = resp.json()[0]
        _assert_keys(item, {
            "tournament", "first_year", "last_year", "editions",
            "matches", "total_goals", "home_wins", "away_wins",
            "draws", "avg_goals", "unique_teams",
        }, "tournaments.item")

    def test_tournaments_types(self, client: TestClient):
        resp = client.get("/tournaments")
        item = resp.json()[0]
        assert isinstance(item["tournament"], str)
        assert isinstance(item["first_year"], int)
        assert isinstance(item["matches"], int)
        assert isinstance(item["total_goals"], int)
        assert isinstance(item["avg_goals"], float)

    def test_tournaments_sorted_desc_by_matches(self, client: TestClient):
        resp = client.get("/tournaments")
        data = resp.json()
        matches = [t["matches"] for t in data]
        for i in range(len(matches) - 1):
            assert matches[i] >= matches[i + 1]

    # ------------------------------------------------------------------
    #  Filter tests
    # ------------------------------------------------------------------

    def test_filter_country_reduces_results(self, client: TestClient):
        full = client.get("/tournaments").json()
        filt = client.get(f"/tournaments?countries={_KNOWN_COUNTRY}").json()
        assert 0 < len(filt) < len(full)

    def test_filter_date_range_reduces_results(self, client: TestClient):
        full = client.get("/tournaments").json()
        filt = client.get("/tournaments?date_from=2000-01-01&date_to=2020-12-31").json()
        assert 0 < len(filt) < len(full)

    def test_filter_nonexistent_country_returns_empty(self, client: TestClient):
        resp = client.get("/tournaments?countries=NonExistentCountryXYZ").json()
        assert resp == []

    def test_filter_date_from_after_date_to_returns_empty(self, client: TestClient):
        resp = client.get("/tournaments?date_from=2020-01-01&date_to=2010-01-01").json()
        assert resp == []
