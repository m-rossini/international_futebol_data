"""Tests for GET /countries endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status


class TestCountries:
    def test_countries_exists(self, client: TestClient):
        resp = client.get("/countries")
        _assert_status(resp)
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_countries_shape(self, client: TestClient):
        resp = client.get("/countries")
        item = resp.json()[0]
        _assert_keys(item, {
            "country", "matches", "total_goals", "home_wins", "away_wins",
            "draws", "unique_teams", "tournaments", "cities",
            "first_year", "last_year", "avg_goals",
        }, "countries.item")

    def test_countries_types(self, client: TestClient):
        resp = client.get("/countries")
        item = resp.json()[0]
        assert isinstance(item["country"], str)
        assert isinstance(item["matches"], int)
        assert isinstance(item["total_goals"], int)
        assert isinstance(item["avg_goals"], float)
        assert isinstance(item["cities"], int)

    def test_countries_sorted_desc_by_matches(self, client: TestClient):
        resp = client.get("/countries")
        data = resp.json()
        matches = [c["matches"] for c in data]
        for i in range(len(matches) - 1):
            assert matches[i] >= matches[i + 1]
