"""Match prediction using ELO ratings.

Uses the standard ELO expected-score formula to calculate win/draw/loss
probabilities for any pairing of teams:
    P(home_win) = 1 / (1 + 10 ^ ((elo_away - (elo_home + home_adv)) / 400))

Draw probability is estimated heuristically from the rating gap.

References
----------
- https://eloratings.net/about
- "The World Football Elo Rating System" — eloratings.net
"""

from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd

from .elo import INITIAL_ELO, HOME_ADVANTAGE, _expected_score


def _draw_probability(rating_gap: float) -> float:
    """Estimate draw probability from the absolute rating gap.

    Uses an empirical decay: smaller gaps → higher draw chance.
    """
    # Baseline: ~24% for equal teams, decaying to ~6% for large gaps
    return 0.24 * np.exp(-abs(rating_gap) / 600.0)


def predict_match(
    home_team: str,
    away_team: str,
    latest_elo: dict[str, float],
    neutral: bool = False,
    home_advantage: float = HOME_ADVANTAGE,
) -> dict[str, Any]:
    """Predict outcome probabilities for a single match.

    Parameters
    ----------
    home_team, away_team : str
        Team names (case-insensitive lookup).
    latest_elo : dict
        Mapping ``{team_name: elo_rating}`` — latest rating for each team.
    neutral : bool
        If True, no home advantage is applied.
    home_advantage : float
        ELO points awarded to the home side.

    Returns
    -------
    dict with keys: home_team, away_team, home_elo, away_elo,
    home_win_prob, draw_prob, away_win_prob, prediction.
    """
    # Case-insensitive lookup
    elo_map = {k.lower(): v for k, v in latest_elo.items()}
    home_lower = home_team.lower()
    away_lower = away_team.lower()

    home_elo = elo_map.get(home_lower, INITIAL_ELO)
    away_elo = elo_map.get(away_lower, INITIAL_ELO)

    home_effective = home_elo
    if not neutral:
        home_effective += home_advantage

    # Expected score (probability of home win, excluding draws)
    home_win_raw = _expected_score(home_effective, away_elo)

    # Estimate draw probability based on effective rating gap
    gap = home_effective - away_elo
    draw_prob = min(_draw_probability(gap), 0.50)  # cap draw at 50%

    # Distribute remaining probability (1 - draw) proportionally
    # This guarantees: home_win + draw + away_win = 1.0 always
    remaining = 1.0 - draw_prob
    home_win_prob = home_win_raw * remaining
    away_win_prob = (1.0 - home_win_raw) * remaining

    # Determine most likely outcome
    probs = {
        "home_win": home_win_prob,
        "draw": draw_prob,
        "away_win": away_win_prob,
    }
    prediction = max(probs, key=probs.get)  # type: ignore[arg-type]

    result = {
        "home_team": home_team.title() if home_team.islower() else home_team,
        "away_team": away_team.title() if away_team.islower() else away_team,
        "home_elo": round(home_elo, 1),
        "away_elo": round(away_elo, 1),
        "home_advantage_applied": 0 if neutral else home_advantage,
        "neutral_venue": neutral,
        "home_win_probability": round(home_win_prob, 4),
        "draw_probability": round(draw_prob, 4),
        "away_win_probability": round(away_win_prob, 4),
        "prediction": prediction.replace("_", " "),
        "confidence": round(max(probs.values()), 4),
    }

    # Flag unknown teams (not found in historical ELO data)
    unknowns = []
    if home_lower not in {k.lower() for k in latest_elo}:
        unknowns.append(home_team)
    if away_lower not in {k.lower() for k in latest_elo}:
        unknowns.append(away_team)
    if unknowns:
        result["unknown_teams"] = unknowns
        result["note"] = (
            "Some teams not found in historical data — using default ELO 1500."
        )

    return result


def get_latest_elo_map(elo_history: pd.DataFrame) -> dict[str, float]:
    """Build ``{team_name: latest_elo}`` mapping from the ELO history dataframe."""
    latest_idx = elo_history.groupby("team")["date"].idxmax()
    latest = elo_history.loc[latest_idx, ["team", "elo_rating_new"]]
    return dict(zip(latest["team"], latest["elo_rating_new"]))


def find_upcoming_matches(
    results: pd.DataFrame, limit: int = 20
) -> list[dict[str, Any]]:
    """Find future / upcoming matches in the results dataset.

    Returns rows where the match date is in the future (today or later).
    """
    today = pd.Timestamp.today().normalize()
    future = results[results["date"] >= today].copy()
    if future.empty:
        return []
    future = future.sort_values("date").head(limit)
    return future.to_dict(orient="records")
