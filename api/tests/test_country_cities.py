"""Tests for GET /country/{country_name}/cities endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import (
    _KNOWN_COUNTRY,
    _assert_keys,
    _assert_status,
)


class TestCountryCities:
    def test_cities_known(self, client: TestClient):
        resp = client.get(f"/country/{_KNOWN_COUNTRY}/cities?limit=5")
        _assert_status(resp)
        body = resp.json()
        assert isinstance(body, list)
        assert 0 < len(body) <= 5
        _assert_keys(
            body[0],
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
            "country.cities[0]",
        )
        # Every city returned belongs to the requested country.
        assert all(c["country"] == _KNOWN_COUNTRY for c in body)

    def test_cities_pagination(self, client: TestClient):
        first = client.get(f"/country/{_KNOWN_COUNTRY}/cities?limit=2&offset=0").json()
        second = client.get(f"/country/{_KNOWN_COUNTRY}/cities?limit=2&offset=2").json()
        assert len(first) == 2
        assert len(second) == 2
        assert [c["city"] for c in first] != [c["city"] for c in second]

    def test_cities_unknown_country(self, client: TestClient):
        resp = client.get("/country/NonExistentCountryXYZ/cities")
        _assert_status(resp, 200)
        assert resp.json().get("error") is True

    def test_cities_rejects_out_of_range_limit(self, client: TestClient):
        resp = client.get(f"/country/{_KNOWN_COUNTRY}/cities?limit=0")
        assert resp.status_code == 422
