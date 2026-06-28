"""Tournament-level analysis."""

import pandas as pd

from .enrich import enrich_match_results
from .winner import biggest_single_win


def _per_tournament_agg(results: pd.DataFrame) -> pd.DataFrame:
    """Build a per-tournament aggregate DataFrame with all stats."""
    df = enrich_match_results(results)

    agg = (
        df.groupby("tournament")
        .agg(
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
        )
        .reset_index()
    )

    agg["avg_goals"] = round(agg["total_goals"] / agg["matches"], 2)
    agg["unique_teams"] = agg[["unique_teams_home", "unique_teams_away"]].max(axis=1)
    agg = agg.drop(columns=["unique_teams_home", "unique_teams_away"])

    for col in [
        "first_year",
        "last_year",
        "editions",
        "matches",
        "total_goals",
        "home_wins",
        "away_wins",
        "draws",
    ]:
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

    # -- per-team aggregates for multiple ranking categories --
    home = df[["home_team", "home_score", "away_score"]].copy()
    home.columns = ["team", "goals_for", "goals_against"]
    away = df[["away_team", "away_score", "home_score"]].copy()
    away.columns = ["team", "goals_for", "goals_against"]
    combined = pd.concat([home, away], ignore_index=True)

    per_team = (
        combined.groupby("team")
        .agg(
            matches_played=("goals_for", "count"),
            goals_for=("goals_for", "sum"),
            goals_against=("goals_against", "sum"),
        )
        .reset_index()
    )

    hw = df[df["home_win"] == 1].groupby("home_team").size()
    aw = df[df["away_win"] == 1].groupby("away_team").size()
    hl = df[(df["home_win"] == 0) & (df["draw"] == 0)].groupby("home_team").size()
    al = df[(df["away_win"] == 0) & (df["draw"] == 0)].groupby("away_team").size()
    hd = df[df["draw"] == 1].groupby("home_team").size()
    ad = df[df["draw"] == 1].groupby("away_team").size()

    def _safe_add(s1, s2):
        return s1.add(s2, fill_value=0)

    wins = _safe_add(hw, aw)
    losses = _safe_add(hl, al)
    team_draws = _safe_add(hd, ad)

    per_team = per_team.merge(
        wins.rename("wins"), left_on="team", right_index=True, how="left"
    )
    per_team = per_team.merge(
        losses.rename("losses"), left_on="team", right_index=True, how="left"
    )
    per_team = per_team.merge(
        team_draws.rename("draws"), left_on="team", right_index=True, how="left"
    )
    per_team = per_team.fillna(0)
    for col in ["wins", "losses", "draws", "goals_for", "goals_against"]:
        if col in per_team.columns:
            per_team[col] = per_team[col].astype(int)
    per_team["goal_diff"] = per_team["goals_for"] - per_team["goals_against"]

    def _top_n(df, col, n):
        return (
            df.nlargest(n, col)[["team", col]]
            .rename(columns={col: "value"})
            .to_dict(orient="records")
        )

    top_teams = {
        "by_wins": _top_n(per_team, "wins", top_n),
        "by_losses": _top_n(per_team, "losses", top_n),
        "by_draws": _top_n(per_team, "draws", top_n),
        "by_goals_for": _top_n(per_team, "goals_for", top_n),
        "by_goals_against": _top_n(per_team, "goals_against", top_n),
        "by_goal_diff": _top_n(per_team, "goal_diff", top_n),
    }

    # -- top host countries / cities --
    top_countries = df["country"].value_counts().head(top_n)
    top_cities = df["city"].value_counts().head(top_n)

    # -- yearly breakdown --
    yearly = (
        df.groupby("year")
        .agg(
            matches=("total_goals", "count"),
            goals=("total_goals", "sum"),
            home_wins=("home_win", "sum"),
            away_wins=("away_win", "sum"),
            draws=("draw", "sum"),
            teams=(
                "home_team",
                lambda x: len(set(x) | set(df.loc[x.index, "away_team"])),
            ),
        )
        .reset_index()
    )

    yearly_list = []
    for _, row in yearly.iterrows():
        y = int(row["year"])
        yr_df = df[df["year"] == y]
        host = yr_df["country"].mode().iloc[0] if len(yr_df) else None
        yearly_list.append(
            {
                "year": y,
                "matches": int(row["matches"]),
                "goals": int(row["goals"]),
                "avg_goals": round(row["goals"] / row["matches"], 2)
                if row["matches"]
                else 0,
                "home_wins": int(row["home_wins"]),
                "away_wins": int(row["away_wins"]),
                "draws": int(row["draws"]),
                "teams": int(row["teams"]),
                "host_country": host,
            }
        )

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
            "top_teams_by_wins": top_teams["by_wins"],
            "top_teams": top_teams,
            "top_host_countries": [
                {"country": c, "matches": int(m)} for c, m in top_countries.items()
            ],
            "top_host_cities": [
                {"city": c, "matches": int(m)} for c, m in top_cities.items()
            ],
        },
        "yearly": yearly_list,
    }


def season_info(results: pd.DataFrame, tournament: str, year: int) -> dict:
    """Detailed stats for a specific tournament edition (season / year).

    Returns match list, team standings, and edition summary.
    """
    df = results[results["tournament"] == tournament].copy()
    if df.empty:
        raise ValueError(f"Unknown tournament: '{tournament}'")

    df = enrich_match_results(df)
    df = df[df["year"] == year]
    if df.empty:
        raise ValueError(f"No data for tournament '{tournament}' in year {year}")

    # -- edition summary --
    matches = len(df)
    total_goals = int(df["total_goals"].sum())
    avg_goals = round(total_goals / matches, 2) if matches else 0
    home_wins = int(df["home_win"].sum())
    away_wins = int(df["away_win"].sum())
    draws = int(df["draw"].sum())
    unique_teams = int(pd.concat([df["home_team"], df["away_team"]]).nunique())
    host = df["country"].mode().iloc[0] if len(df) else None

    # -- biggest win --
    biggest_win = biggest_single_win(df)

    # -- matches list --
    matches_list = []
    for _, row in df.sort_values("date").iterrows():
        matches_list.append(
            {
                "date": str(row["date"]),
                "home_team": row["home_team"],
                "away_team": row["away_team"],
                "home_score": int(row["home_score"]),
                "away_score": int(row["away_score"]),
                "city": row.get("city"),
                "country": row.get("country"),
            }
        )

    # -- team standings --
    home = df[["home_team", "home_score", "away_score"]].copy()
    home.columns = ["team", "goals_for", "goals_against"]
    away = df[["away_team", "away_score", "home_score"]].copy()
    away.columns = ["team", "goals_for", "goals_against"]
    combined = pd.concat([home, away], ignore_index=True)

    standings = (
        combined.groupby("team")
        .agg(
            matches_played=("goals_for", "count"),
            goals_for=("goals_for", "sum"),
            goals_against=("goals_against", "sum"),
        )
        .reset_index()
    )

    hw = df[df["home_win"] == 1].groupby("home_team").size()
    aw = df[df["away_win"] == 1].groupby("away_team").size()
    hl = df[(df["home_win"] == 0) & (df["draw"] == 0)].groupby("home_team").size()
    al = df[(df["away_win"] == 0) & (df["draw"] == 0)].groupby("away_team").size()
    hd = df[df["draw"] == 1].groupby("home_team").size()
    ad = df[df["draw"] == 1].groupby("away_team").size()

    def _safe_add(s1, s2):
        return s1.add(s2, fill_value=0)

    wins = _safe_add(hw, aw)
    losses = _safe_add(hl, al)
    draw_counts = _safe_add(hd, ad)

    standings = standings.merge(
        wins.rename("wins"), left_on="team", right_index=True, how="left"
    )
    standings = standings.merge(
        losses.rename("losses"), left_on="team", right_index=True, how="left"
    )
    standings = standings.merge(
        draw_counts.rename("draws"), left_on="team", right_index=True, how="left"
    )
    standings = standings.fillna(0)
    for col in [
        "wins",
        "losses",
        "draws",
        "goals_for",
        "goals_against",
        "matches_played",
    ]:
        if col in standings.columns:
            standings[col] = standings[col].astype(int)
    standings["goal_diff"] = standings["goals_for"] - standings["goals_against"]

    # sort by points (3 for win, 1 for draw), then goal diff, then goals for
    standings["points"] = standings["wins"] * 3 + standings["draws"]
    standings = standings.sort_values(
        ["points", "goal_diff", "goals_for"],
        ascending=[False, False, False],
    ).reset_index(drop=True)

    standings_list = standings[
        [
            "team",
            "matches_played",
            "wins",
            "draws",
            "losses",
            "goals_for",
            "goals_against",
            "goal_diff",
            "points",
        ]
    ].to_dict(orient="records")

    return {
        "tournament": tournament,
        "year": year,
        "host_country": host,
        "summary": {
            "matches": matches,
            "total_goals": total_goals,
            "avg_goals_per_match": avg_goals,
            "home_wins": home_wins,
            "away_wins": away_wins,
            "draws": draws,
            "unique_teams": unique_teams,
            "biggest_win": biggest_win,
        },
        "standings": standings_list,
        "matches_list": matches_list,
    }
