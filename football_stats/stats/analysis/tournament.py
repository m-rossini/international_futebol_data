"""Tournament-level analysis."""

import pandas as pd

from .enrich import enrich_match_results
from .winner import biggest_single_win


def _per_tournament_agg(results: pd.DataFrame) -> pd.DataFrame:
    """Build a per-tournament aggregate DataFrame with all stats."""
    df = enrich_match_results(results)

    agg = df.groupby("tournament").agg(
        first_year=("year", "min"),
        last_year=("year", "max"),
        editions=("year", pd.Series.nunique),
        matches=("total_goals", "count"),
        total_goals=("total_goals", "sum"),
        home_wins=("home_win", "sum"),
        away_wins=("away_win", "sum"),
        draws=("draw", "sum"),
        unique_teams_home=("home_team", pd.Series.nunique),
        unique_teams_away=("away_team", pd.Series.nunique),
    ).reset_index()

    agg["avg_goals"] = round(agg["total_goals"] / agg["matches"], 2)
    agg["unique_teams"] = agg[["unique_teams_home", "unique_teams_away"]].max(axis=1)
    agg = agg.drop(columns=["unique_teams_home", "unique_teams_away"])

    for col in ["first_year", "last_year", "editions", "matches", "total_goals",
                 "home_wins", "away_wins", "draws"]:
        agg[col] = agg[col].astype(int)

    return agg


def tournaments_list(results: pd.DataFrame) -> list:
    """List all tournaments with comprehensive aggregate stats."""
    agg = _per_tournament_agg(results)
    records = agg.sort_values("matches", ascending=False).to_dict(orient="records")
    for r in records:
        r["total_goals"] = int(r["total_goals"])
    return records


def tournament_info(results: pd.DataFrame, tournament: str, top_n: int = 10) -> dict:
    """Comprehensive stats for a specific tournament, with yearly breakdown."""
    df = results[results["tournament"] == tournament].copy()
    if df.empty:
        raise ValueError(f"Unknown tournament: '{tournament}'")

    df = enrich_match_results(df)

    # -- overall summary --
    first_year = int(df["year"].min())
    last_year = int(df["year"].max())
    matches = len(df)
    total_goals = int(df["total_goals"].sum())
    avg_goals = round(total_goals / matches, 2) if matches else 0
    home_wins = int(df["home_win"].sum())
    away_wins = int(df["away_win"].sum())
    draws = int(df["draw"].sum())
    unique_teams = int(pd.concat([df["home_team"], df["away_team"]]).nunique())

    # -- biggest win --
    biggest_win = biggest_single_win(df)

    # -- most successful teams --
    top_teams = df["winner"].value_counts().head(top_n)
    top_teams_list = [{"team": team, "wins": int(wins)} for team, wins in top_teams.items()]

    # -- top host countries / cities --
    top_countries = df["country"].value_counts().head(top_n)
    top_cities = df["city"].value_counts().head(top_n)

    # -- yearly breakdown --
    yearly = df.groupby("year").agg(
        matches=("total_goals", "count"),
        goals=("total_goals", "sum"),
        home_wins=("home_win", "sum"),
        away_wins=("away_win", "sum"),
        draws=("draw", "sum"),
        teams=("home_team", lambda x: len(set(x) | set(df.loc[x.index, "away_team"]))),
    ).reset_index()

    yearly_list = []
    for _, row in yearly.iterrows():
        y = int(row["year"])
        yr_df = df[df["year"] == y]
        host = yr_df["country"].mode().iloc[0] if len(yr_df) else None
        yearly_list.append({
            "year": y,
            "matches": int(row["matches"]),
            "goals": int(row["goals"]),
            "avg_goals": round(row["goals"] / row["matches"], 2) if row["matches"] else 0,
            "home_wins": int(row["home_wins"]),
            "away_wins": int(row["away_wins"]),
            "draws": int(row["draws"]),
            "teams": int(row["teams"]),
            "host_country": host,
        })

    return {
        "tournament": tournament,
        "summary": {
            "first_year": first_year,
            "last_year": last_year,
            "editions": int(df["year"].nunique()),
            "matches": matches,
            "total_goals": total_goals,
            "avg_goals_per_match": avg_goals,
            "home_wins": home_wins,
            "away_wins": away_wins,
            "draws": draws,
            "unique_teams": unique_teams,
            "biggest_win": biggest_win,
            "top_teams_by_wins": top_teams_list,
            "top_host_countries": [{"country": c, "matches": int(m)} for c, m in top_countries.items()],
            "top_host_cities": [{"city": c, "matches": int(m)} for c, m in top_cities.items()],
        },
        "yearly": yearly_list,
    }
