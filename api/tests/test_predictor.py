"""Tests for the ELO prediction module."""

from __future__ import annotations

import pandas as pd
import pytest

from football_stats.stats.predictor import (
    _draw_probability,
    find_upcoming_matches,
    get_latest_elo_map,
    predict_match,
)

# Sample ELO map for testing
SAMPLE_ELO = {
    "Brazil": 2100.0,
    "Argentina": 2050.0,
    "England": 1980.0,
    "San Marino": 750.0,
    "Unknown FC": 1500.0,
}


class TestDrawProbability:
    def test_equal_teams(self):
        """Equal teams should have ~24% draw probability."""
        prob = _draw_probability(0)
        assert 0.23 <= prob <= 0.25

    def test_small_gap(self):
        """Small rating gaps should still have meaningful draw probability."""
        prob = _draw_probability(50)
        assert prob > 0.20

    def test_large_gap(self):
        """Large rating gaps should have low draw probability."""
        prob = _draw_probability(500)
        assert prob < 0.12

    def test_symmetric(self):
        """Draw probability should be symmetric (gap direction doesn't matter)."""
        p1 = _draw_probability(100)
        p2 = _draw_probability(-100)
        assert p1 == pytest.approx(p2, rel=1e-6)


class TestPredictMatch:
    def test_home_favorite(self):
        """Strong home team should be favored."""
        result = predict_match("Brazil", "San Marino", SAMPLE_ELO)
        assert result["home_win_probability"] > 0.8
        assert result["prediction"] == "home win"

    def test_away_favorite(self):
        """Strong away team should overcome home advantage in extreme cases."""
        result = predict_match("San Marino", "Brazil", SAMPLE_ELO)
        assert result["away_win_probability"] > 0.7

    def test_neutral_venue(self):
        """Neutral venue should still favor the stronger team."""
        result = predict_match("Brazil", "Argentina", SAMPLE_ELO, neutral=True)
        # Brazil has higher ELO
        assert result["home_win_probability"] > result["away_win_probability"]
        assert result["home_advantage_applied"] == 0

    def test_home_advantage_applied(self):
        """Home advantage should be applied when not neutral."""
        result = predict_match("Brazil", "Argentina", SAMPLE_ELO)
        assert result["home_advantage_applied"] > 0

    def test_unknown_team(self):
        """Unknown teams should get default 1500 ELO."""
        result = predict_match("Brazil", "Nowhere FC", SAMPLE_ELO)
        assert "unknown_teams" in result
        assert "Nowhere FC" in result["unknown_teams"]

    def test_probabilities_sum_to_one(self):
        """Home + draw + away probabilities should sum to 1."""
        result = predict_match("England", "Argentina", SAMPLE_ELO)
        total = (
            result["home_win_probability"]
            + result["draw_probability"]
            + result["away_win_probability"]
        )
        assert total == pytest.approx(1.0, rel=1e-4)

    def test_close_teams_home(self):
        """Closely matched teams with home advantage should slightly favor home."""
        result = predict_match("England", "Argentina", SAMPLE_ELO)
        assert result["home_win_probability"] > result["away_win_probability"]

    def test_confidence_near_certain(self):
        """Very mismatched teams should have high confidence."""
        result = predict_match("Brazil", "San Marino", SAMPLE_ELO)
        assert result["confidence"] > 0.9


class TestGetLatestEloMap:
    def test_basic(self):
        """Should return a dict mapping team names to latest ELO."""
        elo_history = pd.DataFrame(
            {
                "team": ["Brazil", "Argentina"],
                "date": pd.to_datetime(["2024-01-01", "2024-01-01"]),
                "elo_rating_new": [2100.0, 2050.0],
            }
        )
        result = get_latest_elo_map(elo_history)
        assert result["Brazil"] == 2100.0
        assert result["Argentina"] == 2050.0

    def test_latest_only(self):
        """Should return the latest ELO for teams with multiple entries."""
        elo_history = pd.DataFrame(
            {
                "team": ["Brazil", "Brazil", "Brazil"],
                "date": pd.to_datetime(["2020-01-01", "2022-01-01", "2024-01-01"]),
                "elo_rating_new": [2000.0, 2050.0, 2100.0],
            }
        )
        result = get_latest_elo_map(elo_history)
        assert result["Brazil"] == 2100.0


class TestFindUpcomingMatches:
    def test_no_upcoming(self):
        """Should return empty list when no future matches exist."""
        results = pd.DataFrame(
            {
                "date": pd.to_datetime(["2000-01-01", "2005-01-01"]),
                "home_team": ["A", "B"],
                "away_team": ["C", "D"],
                "home_score": [1, 2],
                "away_score": [0, 1],
            }
        )
        upcoming = find_upcoming_matches(results)
        assert upcoming == []

    def test_with_upcoming(self):
        """Should find future matches."""
        today = pd.Timestamp.today().normalize()
        results = pd.DataFrame(
            {
                "date": pd.to_datetime([today, today + pd.Timedelta(days=7)]),
                "home_team": ["Brazil", "Argentina"],
                "away_team": ["England", "Germany"],
                "home_score": [None, None],
                "away_score": [None, None],
                "tournament": ["Friendly", "Friendly"],
            }
        )
        upcoming = find_upcoming_matches(results, limit=5)
        assert len(upcoming) == 2

    def test_limit(self):
        """Should respect the limit parameter."""
        today = pd.Timestamp.today().normalize()
        dates = [today + pd.Timedelta(days=i) for i in range(10)]
        results = pd.DataFrame(
            {
                "date": dates,
                "home_team": [f"Team{i}" for i in range(10)],
                "away_team": [f"Opp{i}" for i in range(10)],
                "home_score": [None] * 10,
                "away_score": [None] * 10,
            }
        )
        upcoming = find_upcoming_matches(results, limit=3)
        assert len(upcoming) == 3
