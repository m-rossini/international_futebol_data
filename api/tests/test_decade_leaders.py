"""Tests for the Decade Leaders endpoint."""

from tests.helpers import _assert_status, _assert_keys


class TestDecadeLeaders:
    """Tests for GET /elo-ranking/decade-leaders"""

    ENDPOINT = "/elo-ranking/decade-leaders"

    def test_decade_leaders_status(self, client):
        """Response should be 200 OK."""
        resp = client.get(self.ENDPOINT)
        _assert_status(resp)

    def test_decade_leaders_structure(self, client):
        """Response should have decades list and total_decades."""
        resp = client.get(self.ENDPOINT)
        data = resp.json()
        _assert_keys(data, {"decades", "total_decades"}, self.ENDPOINT)
        assert data["total_decades"] > 0
        assert len(data["decades"]) == data["total_decades"]

    def test_decade_entry_structure(self, client):
        """Each decade should have decade, year_range, leader, teams."""
        resp = client.get(f"{self.ENDPOINT}?top_n=3")
        data = resp.json()
        for decade in data["decades"]:
            _assert_keys(
                decade,
                {"decade", "year_range", "leader", "teams"},
                f"{self.ENDPOINT}/decade",
            )
            assert len(decade["teams"]) == 3

    def test_leader_structure(self, client):
        """Leader should have team, avg_elo, peak_elo, match_count."""
        resp = client.get(f"{self.ENDPOINT}?top_n=5")
        data = resp.json()
        for decade in data["decades"]:
            leader = decade["leader"]
            _assert_keys(
                leader,
                {"team", "avg_elo", "peak_elo", "match_count"},
                f"{self.ENDPOINT}/leader",
            )
            assert isinstance(leader["avg_elo"], (int, float))
            assert leader["avg_elo"] > 0

    def test_leader_is_first_in_teams(self, client):
        """Leader should match first team in teams list."""
        resp = client.get(f"{self.ENDPOINT}?top_n=5")
        data = resp.json()
        for decade in data["decades"]:
            assert decade["leader"]["team"] == decade["teams"][0]["team"]

    def test_decades_sorted(self, client):
        """Decades should be sorted chronologically."""
        resp = client.get(self.ENDPOINT)
        data = resp.json()
        decades = [d["decade"] for d in data["decades"]]
        assert decades == sorted(decades)

    def test_top_n_param(self, client):
        """top_n should control number of teams per decade."""
        for n in [3, 5, 10]:
            resp = client.get(f"{self.ENDPOINT}?top_n={n}")
            data = resp.json()
            for decade in data["decades"]:
                assert len(decade["teams"]) == n

    def test_decade_filter(self, client):
        """Filtering by specific decade should return only that decade."""
        resp = client.get(f"{self.ENDPOINT}?decade=2000s")
        data = resp.json()
        assert data["total_decades"] == 1
        assert data["decades"][0]["decade"] == "2000s"

    def test_teams_sorted_by_avg_elo(self, client):
        """Teams within a decade should be sorted by avg_elo descending."""
        resp = client.get(f"{self.ENDPOINT}?top_n=10")
        data = resp.json()
        for decade in data["decades"]:
            elos = [t["avg_elo"] for t in decade["teams"]]
            assert elos == sorted(elos, reverse=True)

    def test_known_decade_leader_2000s(self, client):
        """In the 2000s, Brazil should be among top teams."""
        resp = client.get(f"{self.ENDPOINT}?decade=2000s&top_n=10")
        data = resp.json()
        if data["total_decades"] > 0:
            teams = [t["team"] for t in data["decades"][0]["teams"]]
            assert "Brazil" in teams

    def test_peak_elo_ge_avg_elo(self, client):
        """Peak ELO should be >= average ELO for each team."""
        resp = client.get(f"{self.ENDPOINT}?top_n=5")
        data = resp.json()
        for decade in data["decades"]:
            for team in decade["teams"]:
                assert team["peak_elo"] >= team["avg_elo"]

    def test_known_decades_present(self, client):
        """Recent decades (1990s, 2000s, 2010s, 2020s) should be present."""
        resp = client.get(self.ENDPOINT)
        data = resp.json()
        present_decades = {d["decade"] for d in data["decades"]}
        for expected in ["1990s", "2000s", "2010s"]:
            assert expected in present_decades, f"{expected} should be present"

    def test_peak_elo_sensible_range(self, client):
        """ELO ratings should be in a sensible range."""
        resp = client.get(f"{self.ENDPOINT}?top_n=5")
        data = resp.json()
        for decade in data["decades"]:
            for team in decade["teams"]:
                assert 1000 <= team["avg_elo"] <= 2500, (
                    f"{team['team']} avg ELO {team['avg_elo']} out of range"
                )
                assert 1000 <= team["peak_elo"] <= 2500, (
                    f"{team['team']} peak ELO {team['peak_elo']} out of range"
                )
