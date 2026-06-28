"""Tests for FIFA World Ranking endpoints."""

from tests.helpers import _KNOWN_TEAM, _assert_status, _assert_keys


class TestFifaRankingCurrent:
    """GET /fifa-ranking/current"""

    ENDPOINT = "/fifa-ranking/current"

    def test_default_top_n(self, client):
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)
        data = resp.json()
        _assert_keys(data, {"rank_date", "top_n", "ranking"}, "fifa-ranking/current")
        assert data["top_n"] == 50
        assert len(data["ranking"]) == 50
        # First entry should be rank 1
        assert data["ranking"][0]["rank"] == 1
        assert "country_full" in data["ranking"][0]
        assert "total_points" in data["ranking"][0]

    def test_custom_top_n(self, client):
        resp = client.get(f"{self.ENDPOINT}?top_n=10")
        _assert_status(resp)
        data = resp.json()
        assert data["top_n"] == 10
        assert len(data["ranking"]) == 10

    def test_top_n_1(self, client):
        """Top 1 should return just the #1 ranked team."""
        resp = client.get(f"{self.ENDPOINT}?top_n=1")
        _assert_status(resp)
        data = resp.json()
        assert len(data["ranking"]) == 1
        assert data["ranking"][0]["rank"] == 1

    def test_rankings_have_required_fields(self, client):
        resp = client.get(f"{self.ENDPOINT}?top_n=5")
        _assert_status(resp)
        data = resp.json()
        required = {"rank", "country_full", "country_abrv", "total_points", "confederation"}
        for entry in data["ranking"]:
            _assert_keys(entry, required, "fifa ranking entry")

    def test_rank_date_is_present(self, client):
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)
        data = resp.json()
        assert data["rank_date"] is not None
        # Should be a date string like YYYY-MM-DD
        assert len(data["rank_date"]) == 10


class TestFifaRankingHistory:
    """GET /fifa-ranking/history/{country}"""

    ENDPOINT = "/fifa-ranking/history"

    def test_known_team(self, client):
        resp = client.get(f"{self.ENDPOINT}/{_KNOWN_TEAM}")
        _assert_status(resp)
        data = resp.json()
        _assert_keys(data, {"country", "snapshots", "history", "from", "to"}, "fifa-ranking/history")
        assert data["country"].lower() == _KNOWN_TEAM.lower()
        assert data["snapshots"] > 0
        assert len(data["history"]) == data["snapshots"]

    def test_case_insensitive(self, client):
        resp_lower = client.get(f"{self.ENDPOINT}/brazil")
        resp_mixed = client.get(f"{self.ENDPOINT}/BrAzIl")
        _assert_status(resp_lower)
        _assert_status(resp_mixed)
        assert resp_lower.json()["snapshots"] == resp_mixed.json()["snapshots"]

    def test_unknown_team(self, client):
        resp = client.get(f"{self.ENDPOINT}/NonExistentCountryXYZ")
        _assert_status(resp, 404)
        assert "not found" in resp.json()["detail"].lower()

    def test_history_entry_structure(self, client):
        resp = client.get(f"{self.ENDPOINT}/{_KNOWN_TEAM}?top_n=3")
        _assert_status(resp)
        data = resp.json()
        if data["history"]:
            entry = data["history"][0]
            _assert_keys(entry, {"rank", "country_full", "total_points", "rank_date"}, "history entry")

    def test_history_has_valid_dates(self, client):
        """All history entries have valid dates."""
        resp = client.get(f"{self.ENDPOINT}/{_KNOWN_TEAM}")
        _assert_status(resp)
        data = resp.json()
        for entry in data["history"]:
            assert len(str(entry["rank_date"])) >= 10


class TestFifaRankingSnapshots:
    """GET /fifa-ranking/snapshots"""

    ENDPOINT = "/fifa-ranking/snapshots"

    def test_snapshots_list(self, client):
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)
        data = resp.json()
        _assert_keys(data, {"total_snapshots", "from", "to", "dates"}, "fifa-ranking/snapshots")
        assert data["total_snapshots"] > 0
        assert len(data["dates"]) == data["total_snapshots"]

    def test_snapshots_are_sorted(self, client):
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)
        data = resp.json()
        # Should be sorted descending (most recent first)
        dates = data["dates"]
        assert dates == sorted(dates, reverse=True), "Snapshots should be sorted descending"

    def test_date_format(self, client):
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)
        data = resp.json()
        for d in data["dates"]:
            assert len(d) == 10, f"Expected YYYY-MM-DD, got {d}"
