"""Player entity derivation from goalscorers.csv.

Each distinct scorer name becomes one player entity with aggregated
stats: teams played for, total goals, caps (distinct matches),
first/last year, tournaments. Derived purely from ``goalscorers.csv``
so no scraping or external network calls are needed.

Wikidata enrichment (DOB, position, aliases) is intentionally out of
scope for v1 and tracked as a separate step (C1 in the roadmap).
"""

from __future__ import annotations

import logging
import re
from typing import Any

import pandas as pd

logger = logging.getLogger("stats.server.players")


def _slug(name: str) -> str:
    """Stable player id from name (lowercase, runs of non-alnum -> dash)."""
    return re.sub(r"[^a-z0-9]+", "-", name.strip().lower()).strip("-")


def _filter_goalscorers(
    goalscorers: pd.DataFrame, filters: dict[str, Any] | None
) -> pd.DataFrame:
    """Apply the same filter semantics as FilterParams to a goalscorers frame."""
    if goalscorers is None or goalscorers.empty or not filters:
        return goalscorers

    df = goalscorers.copy()

    if filters.get("teams"):
        teams = filters["teams"]
        df = df[df["team"].isin(teams)]
    if filters.get("tournaments") and "tournament" in df.columns:
        df = df[df["tournament"].isin(filters["tournaments"])]
    if filters.get("countries"):
        df = df[df["country"].isin(filters["countries"])]
    if filters.get("date_from"):
        df = df[df["date"] >= filters["date_from"]]
    if filters.get("date_to"):
        df = df[df["date"] <= filters["date_to"]]

    return df


def build_players(goalscorers: pd.DataFrame) -> list[dict]:
    """Derive player entities from a goalscorers frame.

    Each scorer name becomes one player entity with aggregated stats.
    Returns a list sorted by total goals (descending).
    """
    if goalscorers is None or goalscorers.empty:
        return []

    df = goalscorers.copy()
    df["year"] = pd.to_datetime(df["date"], errors="coerce").dt.year
    df["scorer_clean"] = df["scorer"].astype(str).str.strip()

    players: list[dict] = []
    for name, group in df.groupby("scorer_clean", sort=False):
        teams = sorted(group["team"].dropna().unique().tolist())
        match_keys = group.apply(
            lambda r: (str(r["date"]), str(r["home_team"]), str(r["away_team"])),
            axis=1,
        )
        caps = int(match_keys.nunique())
        goals = int(len(group))
        years = group["year"].dropna()
        first_year = int(years.min()) if not years.empty else None
        last_year = int(years.max()) if not years.empty else None
        tournaments = (
            sorted(group["tournament"].dropna().unique().tolist())
            if "tournament" in df.columns
            else []
        )

        players.append(
            {
                "player_id": _slug(name),
                "name": name,
                "teams": teams,
                "goals": goals,
                "matches": caps,
                "first_year": first_year,
                "last_year": last_year,
                "tournaments": tournaments,
            }
        )

    players.sort(key=lambda p: p["goals"], reverse=True)
    logger.info("Derived %d player entities from %d scorer rows", len(players), len(df))
    return players


def build_player_detail(goalscorers: pd.DataFrame, name: str) -> dict[str, Any]:
    """Derive the full detail record for one player.

    Includes summary stats, a year-by-year career breakdown and the
    tournaments the player scored in.
    """
    if goalscorers is None or goalscorers.empty:
        raise ValueError("No goalscorer data available.")

    df = goalscorers.copy()
    g = df[df["scorer"].astype(str).str.strip() == name.strip()]
    if g.empty:
        raise ValueError(f"Unknown player: '{name}'")

    df["year"] = pd.to_datetime(df["date"], errors="coerce").dt.year
    g = g.copy()
    g["year"] = pd.to_datetime(g["date"], errors="coerce").dt.year

    teams = sorted(g["team"].dropna().unique().tolist())
    match_keys = g.apply(
        lambda r: (str(r["date"]), str(r["home_team"]), str(r["away_team"])),
        axis=1,
    )
    caps = int(match_keys.nunique())
    goals = int(len(g))
    years = g["year"].dropna()
    first_year = int(years.min()) if not years.empty else None
    last_year = int(years.max()) if not years.empty else None
    tournaments = (
        sorted(g["tournament"].dropna().unique().tolist())
        if "tournament" in g.columns
        else []
    )

    # Career by year: goals + matches + teams per year.
    career_rows: list[dict[str, Any]] = []
    for year, year_group in g.groupby("year", sort=False):
        y_teams = sorted(year_group["team"].dropna().unique().tolist())
        y_match_keys = year_group.apply(
            lambda r: (str(r["date"]), str(r["home_team"]), str(r["away_team"])),
            axis=1,
        )
        career_rows.append(
            {
                "year": int(year),
                "goals": int(len(year_group)),
                "matches": int(y_match_keys.nunique()),
                "teams": y_teams,
                "tournaments": sorted(
                    year_group["tournament"].dropna().unique().tolist()
                )
                if "tournament" in year_group.columns
                else [],
            }
        )
    career_rows.sort(key=lambda r: r["year"])

    # Top teams by goals.
    team_goals = g.groupby("team").size().sort_values(ascending=False)
    top_teams = [
        {"team": team, "goals": int(count)}
        for team, count in team_goals.head(5).items()
    ]

    return {
        "player_id": _slug(name),
        "name": name,
        "summary": {
            "teams": teams,
            "goals": goals,
            "matches": caps,
            "first_year": first_year,
            "last_year": last_year,
            "tournaments": tournaments,
        },
        "career": career_rows,
        "tournaments": tournaments,
        "top_teams": top_teams,
    }
