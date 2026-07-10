"""Match-level goalscorer and shootout reconstruction."""

from __future__ import annotations

import pandas as pd


def match_goalscorers(
    date: str,
    home_team: str,
    away_team: str,
    goalscorers: pd.DataFrame,
    shootouts: pd.DataFrame,
    results: pd.DataFrame,
) -> dict:
    """Return goalscorers and shootout info for a specific match."""
    ts = pd.Timestamp(date)

    # Goalscorers for this match
    gs = goalscorers
    mask = (
        (gs["date"] == ts)
        & (gs["home_team"] == home_team)
        & (gs["away_team"] == away_team)
    )
    scorers_df = gs.loc[
        mask, ["team", "scorer", "minute", "own_goal", "penalty"]
    ].copy()
    scorers_df = scorers_df.sort_values("minute")
    scorers = scorers_df.to_dict(orient="records")
    # Convert minute to int for clean JSON
    for s in scorers:
        s["minute"] = int(s["minute"]) if pd.notna(s["minute"]) else None
        s["own_goal"] = bool(s["own_goal"])
        s["penalty"] = bool(s["penalty"])

    # Shootout info
    shootout_info = None
    if shootouts is not None and not shootouts.empty:
        s_mask = (
            (shootouts["date"] == ts)
            & (shootouts["home_team"] == home_team)
            & (shootouts["away_team"] == away_team)
        )
        if s_mask.any():
            s_row = shootouts.loc[s_mask].iloc[0]
            shootout_info = {
                "winner": s_row.get("winner"),
                "first_shooter": s_row.get("first_shooter") or None,
            }

    # Match info from results
    r_mask = (
        (results["date"] == ts)
        & (results["home_team"] == home_team)
        & (results["away_team"] == away_team)
    )
    if r_mask.any():
        r_row = results.loc[r_mask].iloc[0]
        return {
            "date": date,
            "home_team": home_team,
            "away_team": away_team,
            "home_score": int(r_row["home_score"]),
            "away_score": int(r_row["away_score"]),
            "tournament": r_row.get("tournament"),
            "city": r_row.get("city"),
            "country": r_row.get("country"),
            "scorers": scorers,
            "shootout": shootout_info,
        }

    # Fallback if match not found in results (shouldn't happen)
    return {
        "date": date,
        "home_team": home_team,
        "away_team": away_team,
        "scorers": scorers,
        "shootout": shootout_info,
    }
