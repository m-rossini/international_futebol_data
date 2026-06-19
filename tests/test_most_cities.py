"""Tests for GET /most/city and GET /most/cities endpoints."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status


class TestMostCities:
    def test_most_city(self, client: TestClient):
        resp = client.get("/most/city")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"stat", "top_n", "ranking"}, "most/city")

    def test_most_cities_alias(self, client: TestClient):
        resp = client.get("/most/cities")
        _assert_status(resp)
        assert resp.json()["stat"] == "cities"

    def test_most_city_ranking_shape(self, client: TestClient):
        resp = client.get("/most/city")
        item = resp.json()["ranking"][0]
        _assert_keys(item, {"city", "matches"}, "most/city.item")
        assert isinstance(item["city"], str)
        assert isinstance(item["matches"], int)

    def test_most_city_descending(self, client: TestClient):
        resp = client.get("/most/city")
        matches = [r["matches"] for r in resp.json()["ranking"]]
        for i in range(len(matches) - 1):
            assert matches[i] >= matches[i + 1]

    def test_most_city_top_n(self, client: TestClient):
        resp = client.get("/most/city?top_n=5")
        assert len(resp.json()["ranking"]) == 5
