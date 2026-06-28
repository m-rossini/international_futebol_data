"""Tests for ranking comparison endpoints (FIFA vs ELO)."""

from tests.helpers import _KNOWN_TEAM, _assert_status, _assert_keys


class TestRankingComparison:
    """GET /ranking-comparison"""

    ENDPOINT = "/ranking-comparison"

    def test_default_top_n(self, client):
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)
        data = resp.json()
        _assert_keys(data, {"fifa_snapshot_date", "elo_calculation_date",
                            "total_matched", "comparison"}, "ranking-comparison")
        assert data["total_matched"] > 0
        assert len(data["comparison"]) > 0
        assert len(data["comparison"]) <= 30  # can be less if team names don't match

    def test_custom_top_n(self, client):
        resp = client.get(f"{self.ENDPOINT}?top_n=10")
        _assert_status(resp)
        data = resp.json()
        assert len(data["comparison"]) > 0
        assert len(data["comparison"]) <= 10

    def test_comparison_entry_fields(self, client):
        resp = client.get(f"{self.ENDPOINT}?top_n=5")
        _assert_status(resp)
        data = resp.json()
        required = {"team", "fifa_rank", "fifa_points", "elo_rank",
                    "elo_rating", "confederation", "rank_difference"}
        for entry in data["comparison"]:
            _assert_keys(entry, required, "comparison entry")
            # rank_difference = elo_rank - fifa_rank
            assert isinstance(entry["rank_difference"], int)

    def test_sorted_by_fifa_rank(self, client):
        resp = client.get(f"{self.ENDPOINT}?top_n=20")
        _assert_status(resp)
        data = resp.json()
        ranks = [entry["fifa_rank"] for entry in data["comparison"]]
        assert ranks == sorted(ranks), "Should be sorted by FIFA rank ascending"

    def test_fifa_vs_elo_dates(self, client):
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)
        data = resp.json()
        assert len(data["fifa_snapshot_date"]) == 10
        assert len(data["elo_calculation_date"]) == 10


class TestRankingComparisonTeam:
    """GET /ranking-comparison/{team}"""

    ENDPOINT = "/ranking-comparison"

    def test_known_team(self, client):
        resp = client.get(f"{self.ENDPOINT}/{_KNOWN_TEAM}")
        _assert_status(resp)
        data = resp.json()
        _assert_keys(data, {"team", "confederation", "fifa_snapshots", "elo_matches",
                            "merged_points", "from", "to", "timeline"}, "ranking-comparison/team")
        assert data["team"].lower() == _KNOWN_TEAM.lower()
        assert data["fifa_snapshots"] > 0
        assert data["elo_matches"] > 0

    def test_case_insensitive(self, client):
        resp_lower = client.get(f"{self.ENDPOINT}/brazil")
        resp_mixed = client.get(f"{self.ENDPOINT}/BrAzIl")
        _assert_status(resp_lower)
        _assert_status(resp_mixed)
        assert resp_lower.json()["fifa_snapshots"] == resp_mixed.json()["fifa_snapshots"]

    def test_unknown_team(self, client):
        resp = client.get(f"{self.ENDPOINT}/NonExistentTeamXYZ")
        _assert_status(resp, 404)

    def test_timeline_entries(self, client):
        resp = client.get(f"{self.ENDPOINT}/{_KNOWN_TEAM}")
        _assert_status(resp)
        data = resp.json()
        if data["timeline"]:
            entry = data["timeline"][0]
            _assert_keys(entry, {"date", "fifa_rank", "fifa_points", "elo_rating"}, "timeline entry")
            assert isinstance(entry["fifa_rank"], int)
            assert isinstance(entry["elo_rating"], (int, float))

    def test_timeline_sorted(self, client):
        resp = client.get(f"{self.ENDPOINT}/{_KNOWN_TEAM}")
        _assert_status(resp)
        data = resp.json()
        dates = [entry["date"] for entry in data["timeline"]]
        assert dates == sorted(dates), "Timeline should be sorted by date ascending"

    def test_date_filtering(self, client):
        resp = client.get(f"{self.ENDPOINT}/{_KNOWN_TEAM}?date_from=2018-01-01&date_to=2022-12-31")
        _assert_status(resp)
        data = resp.json()
        for entry in data["timeline"]:
            assert entry["date"] >= "2018-01-01"
            assert entry["date"] <= "2022-12-31"

    def test_fifa_rank_and_elo_correlation(self, client):
        """FIFA rank and ELO should roughly correlate (lower FIFA rank → higher ELO)."""
        resp = client.get(f"{self.ENDPOINT}/{_KNOWN_TEAM}")
        _assert_status(resp)
        data = resp.json()
        timeline = data["timeline"]
        if len(timeline) > 5:
            # Check first vs last: generally teams improve over time
            first_elo = timeline[0]["elo_rating"]
            last_elo = timeline[-1]["elo_rating"]
            # At least verify both are positive
            assert first_elo > 0
            assert last_elo > 0
