"""Tests for GET /most/country and GET /most/countries endpoints."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status


class TestMostCountries:
    def test_most_country(self, client: TestClient):
        resp = client.get("/most/country")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"stat", "top_n", "ranking"}, "most/country")

    def test_most_countries_alias(self, client: TestClient):
        resp = client.get("/most/countries")
        _assert_status(resp)
        assert resp.json()["stat"] == "countries"

    def test_most_country_ranking_shape(self, client: TestClient):
        resp = client.get("/most/country")
        item = resp.json()["ranking"][0]
        _assert_keys(item, {"country", "matches"}, "most/country.item")
        assert isinstance(item["country"], str)
        assert isinstance(item["matches"], int)

    def test_most_country_descending(self, client: TestClient):
        resp = client.get("/most/country")
        matches = [r["matches"] for r in resp.json()["ranking"]]
        for i in range(len(matches) - 1):
            assert matches[i] >= matches[i + 1]

    def test_most_country_top_n(self, client: TestClient):
        resp = client.get("/most/country?top_n=5")
        assert len(resp.json()["ranking"]) == 5
