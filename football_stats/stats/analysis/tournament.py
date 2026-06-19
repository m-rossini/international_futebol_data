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


def _detect_seasons(df: pd.DataFrame) -> list[str]:
    """Detect edition seasons (year ranges) for a tournament.

    Groups consecutive years into ``"YYYY"`` or ``"YYYY-YYYY"`` based on
    whether matches span across a year boundary (gap ≤ 365 days between the
    last match of year N and the first match of year N+1).  Each season is
    capped at 2 years to prevent over-chaining.
    """
    if df.empty:
        return []

    df = df.copy()
    df["dt"] = pd.to_datetime(df["date"])
    df["year"] = df["dt"].dt.year

    years_set = sorted(df["year"].unique())
    if not years_set:
        return []

    # Per-year first/last match dates
    year_bounds: dict[int, tuple[pd.Timestamp, pd.Timestamp]] = {}
    for y in years_set:
        mask = df["year"] == y
        year_bounds[y] = (df.loc[mask, "dt"].min(), df.loc[mask, "dt"].max())

    seasons: list[str] = []
    i = 0
    while i < len(years_set):
        y = years_set[i]
        if i + 1 < len(years_set):
            y_next = years_set[i + 1]
            gap = (year_bounds[y_next][0] - year_bounds[y][1]).days
            if 1 <= gap <= 365:
                seasons.append(f"{y}-{y_next}")
                i += 2
                continue
        seasons.append(str(y))
        i += 1

    return seasons


def tournaments_list(results: pd.DataFrame) -> list:
    """List all tournaments with comprehensive aggregate stats."""
    agg = _per_tournament_agg(results)
    agg = agg.sort_values("matches", ascending=False)

    records: list[dict] = []
    for _, row in agg.iterrows():
        r = row.to_dict()
        r["total_goals"] = int(r["total_goals"])
        tournament_df = results[results["tournament"] == r["tournament"]]
        r["seasons"] = _detect_seasons(tournament_df)
        records.append(r)

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
