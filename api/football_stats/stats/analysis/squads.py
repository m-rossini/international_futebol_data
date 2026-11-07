"""Squad analysis: match squads derived from squads.csv.

Provides the list of matches that have squad data and the squad detail
for a specific match (date + home + away).
"""

from __future__ import annotations

import logging

import pandas as pd

logger = logging.getLogger("stats.server.squads")


def squads_list(squads: pd.DataFrame) -> list[dict]:
    """List matches that have squad data, newest first."""
    if squads is None or squads.empty:
        return []
    df = squads.copy()
    df["match_date"] = pd.to_datetime(df["match_date"], errors="coerce")
    # One row per match per team; collapse to unique matches.
    keys = df.drop_duplicates(
        subset=["match_date", "home_team", "away_team"]
    ).sort_values("match_date", ascending=False)
    return [
        {
            "match_date": str(r["match_date"].date()),
            "home_team": r["home_team"],
            "away_team": r["away_team"],
        }
        for _, r in keys.iterrows()
    ]


def squad_info(
    squads: pd.DataFrame, match_date: str, home_team: str, away_team: str
) -> dict:
    """Squad detail for a specific match (date + home + away).

    Returns both teams' XI and bench with shirt numbers, position,
    starter flag and captain flag.
    """
    if squads is None or squads.empty:
        raise ValueError("No squad data available.")

    df = squads.copy()
    df["match_date"] = pd.to_datetime(df["match_date"], errors="coerce")
    mask = (
        (df["match_date"] == pd.Timestamp(match_date))
        & (df["home_team"] == home_team)
        & (df["away_team"] == away_team)
    )
    g = df[mask]
    if g.empty:
        raise ValueError(
            f"No squad data for {home_team} vs {away_team} on {match_date}."
        )

    def team_squad(team: str) -> dict:
        tg = g[g["team"] == team].sort_values(
            ["starter", "shirt_no"], ascending=[False, True]
        )
        xi = []
        bench = []
        for _, r in tg.iterrows():
            entry = {
                "player_name": r["player_name"],
                "shirt_no": int(r["shirt_no"]) if pd.notna(r["shirt_no"]) else None,
                "position": r["position"],
                "captain": bool(r["captain"]),
            }
            if bool(r["starter"]):
                xi.append(entry)
            else:
                bench.append(entry)
        return {"team": team, "xi": xi, "bench": bench}

    teams = sorted(g["team"].unique().tolist())
    return {
        "match_date": match_date,
        "home_team": home_team,
        "away_team": away_team,
        "squads": [team_squad(t) for t in teams],
    }
