"""Tests for GET /summary endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _KNOWN_TOURNAMENT, _assert_keys, _assert_series_stats, _assert_status


class TestSummary:
    # ------------------------------------------------------------------
    #  Basic shape & types
    # ------------------------------------------------------------------
    def test_summary_ok(self, client: TestClient):
        resp = client.get("/summary")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"results", "goalscorers", "shootouts", "former_names"}, "summary")

    def test_summary_results_keys(self, client: TestClient):
        resp = client.get("/summary")
        body = resp.json()
        _assert_keys(body["results"], {
            "total_matches", "date_range", "tournaments_count",
            "most_common_tournament", "unique_home_teams", "unique_away_teams",
            "total_goals", "avg_goals_per_match", "home_advantage",
        }, "summary.results")

    def test_summary_goalscorers_keys(self, client: TestClient):
        resp = client.get("/summary")
        body = resp.json()
        _assert_keys(body["goalscorers"], {
            "total_goals_recorded", "unique_scorers", "unique_teams_scored_for",
            "date_range", "own_goals", "penalty_goals", "top_scorer",
        }, "summary.goalscorers")

    def test_summary_shootouts_keys(self, client: TestClient):
        resp = client.get("/summary")
        body = resp.json()
        _assert_keys(body["shootouts"], {
            "total_shootouts", "date_range", "unique_winners", "most_common_winner",
        }, "summary.shootouts")

    def test_summary_former_names_keys(self, client: TestClient):
        resp = client.get("/summary")
        body = resp.json()
        _assert_keys(body["former_names"], {
            "total_renamed_countries", "unique_current_names",
            "unique_former_names", "earliest_rename", "latest_rename",
        }, "summary.former_names")

    def test_summary_types(self, client: TestClient):
        resp = client.get("/summary")
        body = resp.json()
        r = body["results"]
        assert isinstance(r["total_matches"], int)
        assert isinstance(r["tournaments_count"], int)
        assert isinstance(r["total_goals"], int)
        assert isinstance(r["avg_goals_per_match"], float)
        assert isinstance(r["date_range"]["from"], str)
        assert isinstance(r["home_advantage"]["home_win_pct"], float)

    def test_summary_goal_distribution_keys(self, client: TestClient):
        """Verify goal_distribution sub-keys exist and are valid."""
        resp = client.get("/summary")
        gd = resp.json()["results"]["goal_distribution"]
        _assert_keys(gd, {"home_score", "away_score", "total_goals", "goal_diff"}, "goal_distribution")
        for key, label in [("home_score", "goal_dist.home"), ("away_score", "goal_dist.away"),
                           ("total_goals", "goal_dist.total"), ("goal_diff", "goal_dist.diff")]:
            _assert_series_stats(gd[key], label)

    def test_summary_match_distribution_keys(self, client: TestClient):
        """Verify match_distribution sub-keys exist and are valid."""
        resp = client.get("/summary")
        md = resp.json()["results"]["match_distribution"]
        _assert_keys(md, {"matches_per_year", "matches_per_tournament"}, "match_distribution")
        _assert_series_stats(md["matches_per_year"], "match_dist.per_year")
        _assert_series_stats(md["matches_per_tournament"], "match_dist.per_tournament")

    def test_summary_scorer_distribution_keys(self, client: TestClient):
        """Verify scorer_distribution exists in goalscorers metadata."""
        resp = client.get("/summary")
        sd = resp.json()["goalscorers"]["scorer_distribution"]
        _assert_keys(sd, {"goals_per_scorer"}, "scorer_distribution")
        _assert_series_stats(sd["goals_per_scorer"], "scorer_dist.goals_per_scorer")

    def test_summary_winner_distribution_keys(self, client: TestClient):
        """Verify winner_distribution exists in shootouts metadata."""
        resp = client.get("/summary")
        wd = resp.json()["shootouts"]["winner_distribution"]
        _assert_keys(wd, {"winner_frequency"}, "winner_distribution")
        _assert_series_stats(wd["winner_frequency"], "winner_dist.winner_freq")

    def test_summary_stats_consistency(self, client: TestClient):
        """Verify counts in goal_distribution match summary totals."""
        resp = client.get("/summary")
        r = resp.json()["results"]
        gd = r["goal_distribution"]
        assert gd["home_score"]["count"] <= r["total_matches"]
        assert gd["away_score"]["count"] <= r["total_matches"]
        assert gd["total_goals"]["count"] <= r["total_matches"]
        assert gd["home_score"]["count"] > 0
        assert gd["total_goals"]["sum"] == r["total_goals"]
        assert abs(gd["total_goals"]["mean"] - r["avg_goals_per_match"]) < 0.02

    # ------------------------------------------------------------------
    #  Filter tests
    # ------------------------------------------------------------------

    def test_filter_tournament_reduces_totals(self, client: TestClient):
        full = client.get("/summary").json()
        filt = client.get(f"/summary?tournaments={_KNOWN_TOURNAMENT}").json()
        assert filt["results"]["total_matches"] < full["results"]["total_matches"]
        assert filt["results"]["total_matches"] > 0

    def test_filter_multiple_tournaments(self, client: TestClient):
        resp = client.get(f"/summary?tournaments=Friendly&tournaments={_KNOWN_TOURNAMENT}").json()
        assert resp["results"]["total_matches"] > 0

    def test_filter_country_reduces_totals(self, client: TestClient):
        full = client.get("/summary").json()
        filt = client.get("/summary?countries=Brazil").json()
        assert filt["results"]["total_matches"] < full["results"]["total_matches"]
        assert filt["results"]["total_matches"] > 0

    def test_filter_date_from(self, client: TestClient):
        full = client.get("/summary").json()
        filt = client.get("/summary?date_from=2000-01-01").json()
        assert filt["results"]["total_matches"] < full["results"]["total_matches"]
        assert filt["results"]["total_matches"] > 0

    def test_filter_date_to(self, client: TestClient):
        filt = client.get("/summary?date_to=1900-01-01").json()
        assert filt["results"]["total_matches"] >= 0

    def test_filter_date_range(self, client: TestClient):
        full = client.get("/summary").json()
        filt = client.get("/summary?date_from=2000-01-01&date_to=2010-12-31").json()
        assert filt["results"]["total_matches"] < full["results"]["total_matches"]
        assert filt["results"]["total_matches"] > 0

    def test_filter_all_params_combined(self, client: TestClient):
        resp = client.get(
            f"/summary?tournaments={_KNOWN_TOURNAMENT}&countries=Germany&date_from=1990&date_to=2020"
        ).json()
        assert resp["results"]["total_matches"] > 0

    def test_filter_nonexistent_tournament_returns_zero(self, client: TestClient):
        resp = client.get("/summary?tournaments=NonExistentTournamentXYZ").json()
        assert resp["results"]["total_matches"] == 0

    def test_filter_date_from_after_date_to_returns_zero(self, client: TestClient):
        """date_from > date_to should produce an empty result."""
        resp = client.get("/summary?date_from=2020-01-01&date_to=2010-01-01").json()
        assert resp["results"]["total_matches"] == 0
