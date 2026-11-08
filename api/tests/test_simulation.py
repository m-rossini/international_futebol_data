"""Tests for stats/simulation.py — Dixon–Coles Monte Carlo match simulation."""

import numpy as np
import pandas as pd

from football_stats.stats.simulation import (
    DEFAULT_N_SIMULATIONS,
    SimulationConfig,
    SimulationResult,
    _elo_to_goal_expectancy,
    _score_probs,
    _sample_poisson,
    _simulate_scores,
    simulate_h2h,
)


def test_score_probs_shape_and_sum():
    """_score_probs returns (N, 3) array where rows sum to ~1."""
    lam_h = np.array([1.0, 2.0, 0.5])
    lam_a = np.array([1.0, 1.0, 1.0])
    probs = _score_probs(lam_h, lam_a, rho=0.0)

    assert probs.shape == (3, 3)
    row_sums = probs.sum(axis=1)
    for s in row_sums:
        assert abs(s - 1.0) < 1e-10, f"Row sum {s} != 1.0"
    assert (probs >= 0).all()


def test_score_probs_home_advantage():
    """Home team should have higher win prob than away team when lam_h > lam_a."""
    probs = _score_probs(np.array([2.0]), np.array([1.0]), rho=0.0)
    assert probs[0, 0] > probs[0, 2]  # home win > away win


def test_score_probs_dc_tau():
    """Dixon–Coles tau adjustment changes low-score probabilities."""
    p_no_tau = _score_probs(np.array([1.0]), np.array([1.0]), rho=0.0)
    p_with_tau = _score_probs(np.array([1.0]), np.array([1.0]), rho=-0.2)

    # With negative rho, 0-0 should be more likely (tau00 = 1 - lam_h*lam_a*rho > 1)
    # 0-0 is cell (0,0) = home index 0, away index 0
    # It's part of home win mask... actually 0-0 is a draw
    # Let's check draw probability changes
    assert p_with_tau[0, 1] > p_no_tau[0, 1]  # draw prob higher with negative rho


def test_sample_poisson_bounds():
    """_sample_poisson returns values within [0, max_k]."""
    rng = np.random.default_rng(42)
    for lam in [0.1, 1.0, 5.0, 10.0]:
        for _ in range(100):
            k = _sample_poisson(lam, 10, rng)
            assert 0 <= k <= 10


def test_simulate_scores_basic():
    """_simulate_scores returns valid probabilities and score counts."""
    result = _simulate_scores(
        1.5, 1.0, -0.038, n_simulations=1000, rng=np.random.default_rng(42)
    )

    assert "team1_win" in result
    assert "draw" in result
    assert "team2_win" in result
    assert "score_histogram" in result
    assert "most_likely_score" in result

    total = result["team1_win"] + result["draw"] + result["team2_win"]
    assert abs(total - 1.0) < 1e-10

    hist_total = sum(result["score_histogram"].values())
    assert abs(hist_total - 1.0) < 1e-10


def test_simulate_scores_home_advantage():
    """Home team with higher lambda should win more often."""
    result_home = _simulate_scores(
        2.0, 1.0, 0.0, n_simulations=2000, rng=np.random.default_rng(42)
    )
    result_away = _simulate_scores(
        1.0, 2.0, 0.0, n_simulations=2000, rng=np.random.default_rng(42)
    )

    assert result_home["team1_win"] > result_away["team1_win"]


def test_elo_to_goal_expectancy():
    """_elo_to_goal_expectancy returns positive expected goals."""
    lam = _elo_to_goal_expectancy(1500, 1500)
    assert lam > 0
    assert isinstance(lam, float)

    # Home advantage should increase expected goals
    lam_home = _elo_to_goal_expectancy(1500, 1500, home_advantage_elo=100)
    assert lam_home > lam

    # Better team should have higher expected goals
    lam_better = _elo_to_goal_expectancy(2000, 1500)
    assert lam_better > lam


def test_simulate_h2h_unknown_team():
    """simulate_h2h returns error result for unknown teams."""
    df = pd.DataFrame(
        {
            "date": ["2022-11-21"],
            "home_team": ["Brazil"],
            "away_team": ["Argentina"],
            "home_score": [1],
            "away_score": [0],
            "tournament": ["Friendly"],
        }
    )
    result = simulate_h2h("Unknown Team", "Argentina", df)

    assert result.team1 == "Unknown Team"
    assert result.team2 == "Argentina"
    assert result.error is not None
    assert result.method == "error"
    assert result.team1_win_prob == 0.0


def test_simulate_h2h_insufficient_data_elo_fallback():
    """Insufficient match data falls back to ELO if available."""
    df = pd.DataFrame(
        {
            "date": pd.date_range("2022-01-01", periods=10, freq="D"),
            "home_team": ["Brazil"] * 10,
            "away_team": ["Argentina"] * 10,
            "home_score": [1] * 10,
            "away_score": [0] * 10,
            "tournament": ["Friendly"] * 10,
        }
    )
    elo_df = pd.DataFrame(
        {
            "team": ["Brazil", "Argentina"],
            "date": ["2022-11-21", "2022-11-21"],
            "elo_rating_new": [1600.0, 1400.0],
        }
    )
    result = simulate_h2h("Brazil", "Argentina", df, elo_ratings=elo_df)

    # Should fall back to ELO-based method
    assert result.method in ("dixon_coles_elo", "dixon_coles_elo_fallback")
    assert result.error is None or "Insufficient" not in str(result.error)


def test_simulate_h2h_dixon_coles():
    """Full Dixon-Coles fit works with enough match data."""
    # Build 30 matches between Brazil and Argentina plus some against other teams
    rows = []
    for i in range(15):
        rows.append(
            {
                "date": pd.Timestamp(f"2022-01-{i + 1:02d}"),
                "home_team": "Brazil",
                "away_team": "Argentina",
                "home_score": 1 + (i % 3),
                "away_score": i % 2,
                "tournament": "Friendly",
            }
        )
        rows.append(
            {
                "date": pd.Timestamp(f"2022-02-{i + 1:02d}"),
                "home_team": "Argentina",
                "away_team": "Brazil",
                "home_score": i % 2,
                "away_score": 1 + (i % 3),
                "tournament": "Friendly",
            }
        )
    df = pd.DataFrame(rows)

    config = SimulationConfig(n_simulations=100)
    result = simulate_h2h("Brazil", "Argentina", df, config=config)

    assert result.error is None
    assert result.method == "dixon_coles"
    assert result.n_matches_used == 30
    assert 0 <= result.team1_win_prob <= 1
    assert 0 <= result.draw_prob <= 1
    assert 0 <= result.team2_win_prob <= 1
    assert (
        abs(result.team1_win_prob + result.draw_prob + result.team2_win_prob - 1.0)
        < 1e-10
    )
    assert result.most_likely_score != ""
    assert len(result.score_histogram) > 0


def test_simulate_h2h_use_elo():
    """use_elo=True uses ELO-based path."""
    df = pd.DataFrame(
        {
            "date": ["2022-11-21"],
            "home_team": ["Brazil"],
            "away_team": ["Argentina"],
            "home_score": [1],
            "away_score": [0],
            "tournament": ["Friendly"],
        }
    )
    elo_df = pd.DataFrame(
        {
            "team": ["Brazil", "Argentina"],
            "date": ["2022-11-21", "2022-11-21"],
            "elo_rating_new": [1600.0, 1400.0],
        }
    )
    config = SimulationConfig(use_elo=True, n_simulations=100)
    result = simulate_h2h("Brazil", "Argentina", df, elo_ratings=elo_df, config=config)

    assert result.method == "dixon_coles_elo"
    assert result.error is None


def test_simulate_h2h_use_elo_no_ratings():
    """use_elo=True with no ELO ratings returns error."""
    df = pd.DataFrame(
        {
            "date": ["2022-11-21"],
            "home_team": ["Brazil"],
            "away_team": ["Argentina"],
            "home_score": [1],
            "away_score": [0],
            "tournament": ["Friendly"],
        }
    )
    config = SimulationConfig(use_elo=True)
    result = simulate_h2h("Brazil", "Argentina", df, config=config)

    assert result.method == "error"
    assert "ELO ratings not available" in result.error


def test_simulation_config_defaults():
    """SimulationConfig has sensible defaults."""
    cfg = SimulationConfig()
    assert cfg.n_simulations == DEFAULT_N_SIMULATIONS
    assert cfg.half_life_years == 3.0
    assert cfg.ridge == 1.0
    assert cfg.rho is None
    assert cfg.use_elo is False
    assert cfg.home_advantage_elo == 0.0
    assert cfg.tournament_type is None


def test_simulation_result_dataclass():
    """SimulationResult is a dataclass with all expected fields."""
    result = SimulationResult(
        team1="Brazil",
        team2="Argentina",
        team1_win_prob=0.5,
        draw_prob=0.25,
        team2_win_prob=0.25,
        team1_expected_goals=1.5,
        team2_expected_goals=1.0,
        n_simulations=100,
        score_histogram={"1-0": 0.2},
        most_likely_score="1-0",
        method="dixon_coles",
        rho=-0.038,
        n_matches_used=30,
    )
    assert result.team1 == "Brazil"
    assert result.method == "dixon_coles"
