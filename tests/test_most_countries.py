"""Tests for GET /most/country and GET /most/countries endpoints."""

from fastapi.testclient import TestClient

from tests.helpers import _KNOWN_TOURNAMENT, _assert_keys, _assert_status


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

    # ------------------------------------------------------------------
    #  Filter tests
    # ------------------------------------------------------------------

    def test_filter_tournament_reduces_ranking(self, client: TestClient):
        full = client.get("/most/country").json()
        filt = client.get(f"/most/country?tournaments={_KNOWN_TOURNAMENT}").json()
        assert len(filt["ranking"]) > 0
        assert filt["ranking"][0]["matches"] <= full["ranking"][0]["matches"]

    def test_filter_date_range(self, client: TestClient):
        resp = client.get("/most/country?date_from=2000-01-01&date_to=2020-12-31").json()
        assert len(resp["ranking"]) > 0

    def test_filter_nonexistent_tournament_returns_empty(self, client: TestClient):
        resp = client.get("/most/country?tournaments=NonExistentTournamentXYZ").json()
        assert resp["ranking"] == []

    def test_filter_date_from_after_date_to_returns_empty(self, client: TestClient):
        resp = client.get("/most/country?date_from=2020-01-01&date_to=2010-01-01").json()
        assert resp["ranking"] == []
