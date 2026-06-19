"""Tests for GET /cities endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status


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
        _assert_keys(item, {
            "city", "country", "matches", "total_goals", "home_wins",
            "away_wins", "draws", "unique_teams", "tournaments",
            "first_year", "last_year", "avg_goals",
        }, "cities.item")

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
