"""Tests for GET /years and GET /years/{year} endpoints."""

from fastapi.testclient import TestClient

from tests.helpers import _KNOWN_COUNTRY, _assert_keys, _assert_status


class TestYears:
    def test_years_exists(self, client: TestClient):
        resp = client.get("/years")
        _assert_status(resp)
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_years_shape(self, client: TestClient):
        resp = client.get("/years")
        item = resp.json()[0]
        _assert_keys(
            item,
            {
                "year",
                "matches",
                "goals",
                "avg_goals",
                "countries",
                "cities",
                "largest_margin",
                "most_goals_match",
                "goals_histogram",
            },
            "years.item",
        )

    def test_years_types(self, client: TestClient):
        resp = client.get("/years")
        item = resp.json()[0]
        assert isinstance(item["year"], int)
        assert isinstance(item["matches"], int)
        assert isinstance(item["goals"], int)
        assert isinstance(item["avg_goals"], float)
        assert isinstance(item["countries"], int)
        assert isinstance(item["cities"], int)
        assert isinstance(item["largest_margin"], int)
        assert isinstance(item["most_goals_match"], int)
        assert isinstance(item["goals_histogram"], dict)

    def test_years_sorted_desc_by_year(self, client: TestClient):
        resp = client.get("/years")
        data = resp.json()
        years = [t["year"] for t in data]
        for i in range(len(years) - 1):
            assert years[i] >= years[i + 1]

    def test_goals_histogram_keys_are_ints(self, client: TestClient):
        resp = client.get("/years")
        item = resp.json()[0]
        for k in item["goals_histogram"]:
            assert isinstance(int(k), int)

    # ------------------------------------------------------------------
    #  Filter tests
    # ------------------------------------------------------------------

    def test_filter_country_reduces_results(self, client: TestClient):
        full = client.get("/years").json()
        filt = client.get(f"/years?countries={_KNOWN_COUNTRY}").json()
        assert 0 < len(filt) <= len(full)

    def test_filter_date_range_reduces_results(self, client: TestClient):
        full = client.get("/years").json()
        filt = client.get("/years?date_from=2000-01-01&date_to=2020-12-31").json()
        assert 0 < len(filt) <= len(full)

    def test_filter_nonexistent_country_returns_empty(self, client: TestClient):
        resp = client.get("/years?countries=NonExistentCountryXYZ").json()
        assert resp == []

    def test_filter_date_from_after_date_to_returns_empty(self, client: TestClient):
        resp = client.get("/years?date_from=2020-01-01&date_to=2010-01-01").json()
        assert resp == []


class TestYearDetail:
    def test_year_detail_exists(self, client: TestClient):
        resp = client.get("/years/2022")
        _assert_status(resp)
        data = resp.json()
        assert isinstance(data, dict)

    def test_year_detail_shape(self, client: TestClient):
        resp = client.get("/years/2022")
        item = resp.json()
        _assert_keys(
            item,
            {
                "year",
                "matches",
                "goals",
                "avg_goals",
                "countries",
                "cities",
                "largest_margin",
                "most_goals_match",
                "goals_histogram",
                "matches_list",
            },
            "years.detail",
        )

    def test_year_detail_matches_list(self, client: TestClient):
        resp = client.get("/years/2022")
        data = resp.json()
        assert isinstance(data["matches_list"], list)
        assert len(data["matches_list"]) > 0
        match = data["matches_list"][0]
        assert "date" in match
        assert "home_team" in match
        assert "away_team" in match
        assert "home_score" in match
        assert "away_score" in match

    def test_year_detail_nonexistent_year(self, client: TestClient):
        resp = client.get("/years/1800")
        data = resp.json()
        assert data.get("error") is True
