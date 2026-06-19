"""Tests for query parameter filters across endpoints."""

from fastapi.testclient import TestClient

from tests.helpers import (
    _KNOWN_CITY,
    _KNOWN_COUNTRY,
    _KNOWN_TOURNAMENT,
    _assert_keys,
    _assert_status,
)


class TestFilters:
    """Verify the ?tournaments=, ?countries=, ?date_from=, ?date_to= filter params work."""

    def test_root_has_filter_params_key(self, client: TestClient):
        resp = client.get("/")
        body = resp.json()
        assert "filter_params" in body
        _assert_keys(body["filter_params"], {"tournaments", "countries", "date_from", "date_to"})

    def test_summary_filter_tournament(self, client: TestClient):
        """Filtering by a tournament should reduce totals."""
        full = client.get("/summary").json()
        filt = client.get("/summary?tournaments=FIFA+World+Cup").json()
        assert filt["results"]["total_matches"] < full["results"]["total_matches"]
        assert filt["results"]["total_matches"] > 0

    def test_summary_filter_multiple_tournaments(self, client: TestClient):
        """Multiple tournament values (OR within the list)."""
        resp = client.get("/summary?tournaments=Friendly&tournaments=FIFA+World+Cup").json()
        assert resp["results"]["total_matches"] > 0

    def test_summary_filter_country(self, client: TestClient):
        """Filter by host country."""
        full = client.get("/summary").json()
        filt = client.get("/summary?countries=Brazil").json()
        assert filt["results"]["total_matches"] < full["results"]["total_matches"]
        assert filt["results"]["total_matches"] > 0

    def test_summary_filter_date_from(self, client: TestClient):
        """Filter by start date (inclusive)."""
        full = client.get("/summary").json()
        filt = client.get("/summary?date_from=2000-01-01").json()
        assert filt["results"]["total_matches"] < full["results"]["total_matches"]
        assert filt["results"]["total_matches"] > 0

    def test_summary_filter_date_to(self, client: TestClient):
        """Filter by end date (inclusive)."""
        filt = client.get("/summary?date_to=1900-01-01").json()
        assert filt["results"]["total_matches"] >= 0

    def test_summary_filter_date_range(self, client: TestClient):
        """Filter by both start and end dates."""
        full = client.get("/summary").json()
        filt = client.get("/summary?date_from=2000-01-01&date_to=2010-12-31").json()
        assert filt["results"]["total_matches"] < full["results"]["total_matches"]
        assert filt["results"]["total_matches"] > 0

    def test_summary_filter_all_params(self, client: TestClient):
        """Combine tournament + country + date range."""
        resp = client.get(
            "/summary?tournaments=FIFA+World+Cup&countries=Germany&date_from=1990&date_to=2020"
        ).json()
        assert resp["results"]["total_matches"] > 0

    def test_filter_empty_result(self, client: TestClient):
        """Filter that matches nothing should return 0 matches."""
        resp = client.get("/summary?tournaments=NonExistentTournamentXYZ").json()
        assert resp["results"]["total_matches"] == 0

    def test_filter_empty_most_teams(self, client: TestClient):
        """most/teams with a filter that returns nothing should give empty ranking."""
        resp = client.get("/most/wins?tournaments=NonExistentTournamentXYZ&top_n=5")
        _assert_status(resp)
        body = resp.json()
        assert len(body["ranking"]) == 0

    def test_filter_on_tournament_endpoint(self, client: TestClient):
        """Tournament-specific endpoint can be filtered by country/date."""
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}?date_from=2000")
        _assert_status(resp)
        body = resp.json()
        assert body["tournament"] == _KNOWN_TOURNAMENT
        assert body["summary"]["matches"] > 0

    def test_filter_on_city_endpoint(self, client: TestClient):
        """City endpoint can be filtered by tournament."""
        resp = client.get(f"/city/{_KNOWN_CITY}?tournaments=FIFA+World+Cup")
        _assert_status(resp)
        body = resp.json()
        assert body["city"] == _KNOWN_CITY

    def test_filter_on_country_endpoint(self, client: TestClient):
        """Country endpoint can be filtered by date range."""
        resp = client.get(f"/country/{_KNOWN_COUNTRY}?date_from=2000&date_to=2010")
        _assert_status(resp)
        assert resp.json()["country"] == _KNOWN_COUNTRY
