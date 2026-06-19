"""Advanced descriptive statistics for pandas Series.

Provides a rich set of statistical measures useful for AI/ML pipelines:
mean, median, mode, min, max, std, variance, skewness, kurtosis,
and percentiles (25th, 50th, 75th).
"""

from __future__ import annotations

from typing import Any

import pandas as pd


def series_stats(series: pd.Series) -> dict[str, float | int | list[float | int] | None]:
    """Compute comprehensive descriptive statistics for a numeric Series.

    Returns a dict with:
        mean, median, mode, min, max, stdev, variance, skewness, kurtosis,
        p25, p50, p75, count, sum, iqr, range

    Handles empty Series gracefully (returns all None / 0 / [])
    """
    if series.empty:
        return {
            "count": 0,
            "sum": 0,
            "mean": None,
            "median": None,
            "mode": [],
            "min": None,
            "max": None,
            "stdev": None,
            "variance": None,
            "skewness": None,
            "kurtosis": None,
            "p25": None,
            "p50": None,
            "p75": None,
            "iqr": None,
            "range": None,
        }

    desc = series.describe()

    # Mode — can be multi-valued
    mode_series = series.mode()
    mode_vals: list[float | int] = []
    for v in mode_series:
        if isinstance(v, (int, float)):
            mode_vals.append(v)

    # Percentiles
    p25 = float(series.quantile(0.25))
    p50 = float(desc["50%"])
    p75 = float(series.quantile(0.75))

    # IQR
    iqr = round(p75 - p25, 2)

    # Range
    rng = int(desc["max"] - desc["min"])

    return {
        "count": int(desc["count"]),
        "sum": int(series.sum()) if series.dtype.kind in ("i", "u") else round(float(series.sum()), 2),
        "mean": round(float(desc["mean"]), 4),
        "median": round(float(desc["50%"]), 4),
        "mode": mode_vals,
        "min": int(desc["min"]) if series.dtype.kind in ("i", "u") else round(float(desc["min"]), 4),
        "max": int(desc["max"]) if series.dtype.kind in ("i", "u") else round(float(desc["max"]), 4),
        "stdev": round(float(desc["std"]), 4),
        "variance": round(float(series.var()), 4),
        "skewness": round(float(series.skew()), 6) if len(series) >= 3 else None,
        "kurtosis": round(float(series.kurtosis()), 6) if len(series) >= 4 else None,
        "p25": round(p25, 4),
        "p50": round(p50, 4),
        "p75": round(p75, 4),
        "iqr": iqr,
        "range": rng,
    }


def goals_distribution_stats(results: pd.DataFrame) -> dict[str, Any]:
    """Full goal distribution statistics from match results.

    Returns a dict with stats for:
        - home_score: distribution of home team goals
        - away_score: distribution of away team goals
        - total_goals: distribution of total goals per match
        - goal_diff: distribution of absolute goal differences
    """
    if results.empty:
        return {
            "home_score": series_stats(pd.Series([], dtype=int)),
            "away_score": series_stats(pd.Series([], dtype=int)),
            "total_goals": series_stats(pd.Series([], dtype=int)),
            "goal_diff": series_stats(pd.Series([], dtype=int)),
        }

    total_goals = results["home_score"] + results["away_score"]
    goal_diff = abs(results["home_score"] - results["away_score"])

    return {
        "home_score": series_stats(results["home_score"]),
        "away_score": series_stats(results["away_score"]),
        "total_goals": series_stats(total_goals),
        "goal_diff": series_stats(goal_diff),
    }


def matches_distribution_stats(results: pd.DataFrame) -> dict[str, Any]:
    """Distribution of matches per year and per tournament.

    Returns stats on the frequency distributions (how many matches per year/tournament).
    """
    if results.empty:
        return {
            "matches_per_year": series_stats(pd.Series([], dtype=int)),
            "matches_per_tournament": series_stats(pd.Series([], dtype=int)),
        }

    matches_per_year = results.groupby(results["date"].dt.year).size()
    matches_per_tournament = results.groupby("tournament").size()

    return {
        "matches_per_year": series_stats(matches_per_year),
        "matches_per_tournament": series_stats(matches_per_tournament),
    }


def scorer_distribution_stats(goalscorers: pd.DataFrame) -> dict[str, Any]:
    """Distribution of goals per scorer."""
    if goalscorers.empty:
        return {"goals_per_scorer": series_stats(pd.Series([], dtype=int))}

    goals_per_scorer = goalscorers["scorer"].value_counts()
    return {"goals_per_scorer": series_stats(goals_per_scorer)}
