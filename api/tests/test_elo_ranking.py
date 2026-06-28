"""Tests for ELO World Ranking endpoints (calculated from match results)."""

from tests.helpers import _KNOWN_TEAM, _assert_status, _assert_keys


class TestEloRankingCurrent:
    """GET /elo-ranking/current"""

    ENDPOINT = "/elo-ranking/current"

    def test_default_top_n(self, client):
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)
        data = resp.json()
        _assert_keys(
            data,
            {"calculation_date", "total_teams", "top_n", "ranking"},
            "elo-ranking/current",
        )
        assert data["top_n"] == 50
        assert len(data["ranking"]) == 50

    def test_custom_top_n(self, client):
        resp = client.get(f"{self.ENDPOINT}?top_n=10")
        _assert_status(resp)
        data = resp.json()
        assert data["top_n"] == 10
        assert len(data["ranking"]) == 10

    def test_top_1(self, client):
        resp = client.get(f"{self.ENDPOINT}?top_n=1")
        _assert_status(resp)
        data = resp.json()
        assert len(data["ranking"]) == 1
        assert data["ranking"][0]["ranking"] == 1

    def test_ranking_fields(self, client):
        resp = client.get(f"{self.ENDPOINT}?top_n=3")
        _assert_status(resp)
        data = resp.json()
        required = {"team", "elo_rating", "ranking", "date"}
        for entry in data["ranking"]:
            _assert_keys(entry, required, "elo ranking entry")
            assert isinstance(entry["elo_rating"], (int, float))
            assert entry["elo_rating"] > 0

    def test_sorted_descending(self, client):
        resp = client.get(f"{self.ENDPOINT}?top_n=20")
        _assert_status(resp)
        data = resp.json()
        ratings = [entry["elo_rating"] for entry in data["ranking"]]
        assert ratings == sorted(ratings, reverse=True), (
            "ELO rankings should be sorted descending"
        )

    def test_calculation_date_exists(self, client):
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)
        data = resp.json()
        assert data["calculation_date"] is not None
        assert len(data["calculation_date"]) == 10


class TestEloRankingHistory:
    """GET /elo-ranking/history/{team}"""

    ENDPOINT = "/elo-ranking/history"

    def test_known_team(self, client):
        resp = client.get(f"{self.ENDPOINT}/{_KNOWN_TEAM}")
        _assert_status(resp)
        data = resp.json()
        _assert_keys(
            data,
            {
                "team",
                "matches_calculated",
                "history",
                "from",
                "to",
                "min_elo",
                "max_elo",
                "current_elo",
            },
            "elo-ranking/history",
        )
        assert data["team"].lower() == _KNOWN_TEAM.lower()
        assert data["matches_calculated"] > 0
        assert len(data["history"]) == data["matches_calculated"]

    def test_case_insensitive(self, client):
        resp_lower = client.get(f"{self.ENDPOINT}/brazil")
        resp_mixed = client.get(f"{self.ENDPOINT}/BrAzIl")
        _assert_status(resp_lower)
        _assert_status(resp_mixed)
        assert (
            resp_lower.json()["matches_calculated"]
            == resp_mixed.json()["matches_calculated"]
        )

    def test_unknown_team(self, client):
        resp = client.get(f"{self.ENDPOINT}/NonExistentTeamXYZ")
        _assert_status(resp, 404)
        assert "not found" in resp.json()["detail"].lower()

    def test_history_entry_fields(self, client):
        resp = client.get(f"{self.ENDPOINT}/{_KNOWN_TEAM}")
        _assert_status(resp)
        data = resp.json()
        if data["history"]:
            entry = data["history"][0]
            _assert_keys(
                entry,
                {
                    "date",
                    "team",
                    "opponent",
                    "elo_rating_new",
                    "elo_rating",
                    "rating_change",
                },
                "elo history entry",
            )

    def test_min_max_current(self, client):
        resp = client.get(f"{self.ENDPOINT}/{_KNOWN_TEAM}")
        _assert_status(resp)
        data = resp.json()
        assert data["min_elo"] <= data["max_elo"]
        assert data["current_elo"] <= data["max_elo"]
        assert data["current_elo"] >= data["min_elo"]

    def test_date_filtering(self, client):
        resp = client.get(
            f"{self.ENDPOINT}/{_KNOWN_TEAM}?date_from=2020-01-01&date_to=2020-12-31"
        )
        _assert_status(resp)
        data = resp.json()
        for entry in data["history"]:
            assert str(entry["date"]) >= "2020-01-01"
            assert str(entry["date"]) <= "2020-12-31"


class TestEloRankingSummary:
    """GET /elo-ranking/summary"""

    ENDPOINT = "/elo-ranking/summary"

    def test_summary_keys(self, client):
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)
        data = resp.json()
        _assert_keys(
            data,
            {
                "total_matches_calculated",
                "total_teams",
                "min_elo",
                "max_elo",
                "mean_elo",
                "median_elo",
                "date_range",
                "top_10",
            },
            "elo-ranking/summary",
        )
        assert data["total_matches_calculated"] > 0
        assert data["total_teams"] > 0

    def test_date_range(self, client):
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)
        data = resp.json()
        _assert_keys(data["date_range"], {"from", "to"}, "elo date_range")
        assert len(data["date_range"]["from"]) == 10
        assert len(data["date_range"]["to"]) == 10

    def test_top_10_entries(self, client):
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)
        data = resp.json()
        assert len(data["top_10"]) <= 10
        if data["top_10"]:
            _assert_keys(
                data["top_10"][0], {"team", "elo_rating", "ranking"}, "elo top_10 entry"
            )

    def test_stats_order(self, client):
        """min_elo <= median_elo <= mean_elo <= max_elo roughly."""
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)
        data = resp.json()
        assert data["min_elo"] <= data["median_elo"]
        assert data["median_elo"] <= data["max_elo"]
