"""Team-level analysis: win rates, head-to-head, rankings."""

import pandas as pd

from .enrich import enrich_match_results
from .advanced_stats import series_stats

_MIN_MATCHES_FOR_RATES = 10

_MOST_TEAM_STATS = {
    "wins": "wins",
    "losses": "losses",
    "draws": "draws",
    "win_rate": "win_rate",
    "loss_rate": "loss_rate",
    "goals_pro": "goals_for",
    "goals_against": "goals_against",
    "matches": "matches_played",
}


def team_yearly(results: pd.DataFrame, team: str) -> list[dict]:
    """Year-by-year wins/losses/draws/goals for a team, sorted by year asc."""
    if results.empty:
        return []

    # Build a single DataFrame with all of this team's appearances
    home = results.loc[results["home_team"] == team, ["date", "home_score", "away_score"]].copy()
    home["result"] = home.apply(
        lambda r: "win" if r["home_score"] > r["away_score"] else ("loss" if r["home_score"] < r["away_score"] else "draw"),
        axis=1,
    )
    home["goals_for"] = home["home_score"]
    home["goals_against"] = home["away_score"]

    away = results.loc[results["away_team"] == team, ["date", "home_score", "away_score"]].copy()
    away["result"] = away.apply(
        lambda r: "win" if r["away_score"] > r["home_score"] else ("loss" if r["away_score"] < r["home_score"] else "draw"),
        axis=1,
    )
    away["goals_for"] = away["away_score"]
    away["goals_against"] = away["home_score"]

    matches = pd.concat([home, away], ignore_index=True)
    matches["year"] = pd.to_datetime(matches["date"], utc=True).dt.year

    yearly = (
        matches.groupby("year")
        .agg(
            matches_played=("result", "count"),
            wins=("result", lambda x: (x == "win").sum()),
            losses=("result", lambda x: (x == "loss").sum()),
            draws=("result", lambda x: (x == "draw").sum()),
            goals_for=("goals_for", "sum"),
            goals_against=("goals_against", "sum"),
        )
        .reset_index()
        .sort_values("year")
    )

    # Convert int columns after pandas
    for col in ["matches_played", "wins", "losses", "draws", "goals_for", "goals_against"]:
        yearly[col] = yearly[col].astype(int)
    yearly["year"] = yearly["year"].astype(int)

    return yearly.to_dict(orient="records")


def team_win_rate(results: pd.DataFrame, team: str) -> dict:
    """Calculate win/draw/loss stats for a given team, with advanced goal statistics."""
    home_wins = results[(results["home_team"] == team) & (results["home_score"] > results["away_score"])]
    away_wins = results[(results["away_team"] == team) & (results["away_score"] > results["home_score"])]
    home_draws = results[(results["home_team"] == team) & (results["home_score"] == results["away_score"])]
    away_draws = results[(results["away_team"] == team) & (results["away_score"] == results["home_score"])]
    home_losses = results[(results["home_team"] == team) & (results["home_score"] < results["away_score"])]
    away_losses = results[(results["away_team"] == team) & (results["away_score"] < results["home_score"])]

    wins = len(home_wins) + len(away_wins)
    draws = len(home_draws) + len(away_draws)
    losses = len(home_losses) + len(away_losses)
    total = wins + draws + losses

    # Collect all goals scored and conceded for this team
    goals_for_home = results.loc[results["home_team"] == team, "home_score"]
    goals_for_away = results.loc[results["away_team"] == team, "away_score"]
    goals_against_home = results.loc[results["home_team"] == team, "away_score"]
    goals_against_away = results.loc[results["away_team"] == team, "home_score"]

    all_goals_for = pd.concat([goals_for_home, goals_for_away])
    all_goals_against = pd.concat([goals_against_home, goals_against_away])

    result = {
        "team": team,
        "matches_played": total,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "points": wins * 3 + draws * 1,
        "win_rate": round(wins / total * 100, 2) if total else 0,
    }

    # Add advanced goal statistics if the team has matches
    if total > 0:
        result["goals_for_stats"] = series_stats(all_goals_for)
        result["goals_against_stats"] = series_stats(all_goals_against)
        # Goal difference per match (positive means team scored more)
        goal_diff_series = all_goals_for.reset_index(drop=True) - all_goals_against.reset_index(drop=True)
        result["goal_diff_stats"] = series_stats(goal_diff_series)

    return result


def team_matches_all(results: pd.DataFrame, team: str) -> list[dict]:
    """Return all matches for a given team, sorted by date."""
    if results.empty:
        return []

    mask = (results["home_team"] == team) | (results["away_team"] == team)
    matches = results[mask].copy()
    # Drop rows with NaN scores (unplayed / future matches)
    matches = matches.dropna(subset=["home_score", "away_score"])
    matches = matches.sort_values("date")

    matches_list = []
    for _, row in matches.iterrows():
        matches_list.append({
            "date": str(row["date"]),
            "home_team": row["home_team"],
            "away_team": row["away_team"],
            "home_score": int(row["home_score"]),
            "away_score": int(row["away_score"]),
            "tournament": row.get("tournament"),
            "city": row.get("city"),
            "country": row.get("country"),
            "neutral": bool(row.get("neutral", False)) if "neutral" in row.index else None,
        })

    return matches_list


def team_matches_by_year(results: pd.DataFrame, team: str, year: int) -> list[dict]:
    """Return all matches for a given team in a given year, sorted by date."""
    if results.empty:
        return []

    mask = (
        ((results["home_team"] == team) | (results["away_team"] == team))
        & (pd.to_datetime(results["date"], utc=True).dt.year == year)
    )
    matches = results[mask].copy()
    # Drop rows with NaN scores (unplayed / future matches)
    matches = matches.dropna(subset=["home_score", "away_score"])
    matches = matches.sort_values("date")

    matches_list = []
    for _, row in matches.iterrows():
        matches_list.append({
            "date": str(row["date"]),
            "home_team": row["home_team"],
            "away_team": row["away_team"],
            "home_score": int(row["home_score"]),
            "away_score": int(row["away_score"]),
            "tournament": row.get("tournament"),
            "city": row.get("city"),
            "country": row.get("country"),
            "neutral": bool(row.get("neutral", False)) if "neutral" in row.index else None,
        })

    return matches_list


def team_vs_team(results: pd.DataFrame, team1: str, team2: str) -> dict:
    """Head-to-head stats between two teams, with advanced goal statistics."""
    mask = (
        ((results["home_team"] == team1) & (results["away_team"] == team2))
        | ((results["home_team"] == team2) & (results["away_team"] == team1))
    )
    matches = results[mask].copy()

    def winner(row):
        if row["home_score"] > row["away_score"]:
            return row["home_team"]
        elif row["away_score"] > row["home_score"]:
            return row["away_team"]
        return "Draw"

    matches["winner"] = matches.apply(winner, axis=1)

    team1_wins = len(matches[matches["winner"] == team1])
    team2_wins = len(matches[matches["winner"] == team2])
    draws = len(matches[matches["winner"] == "Draw"])

    team1_goals = matches[
        (matches["home_team"] == team1)
    ]["home_score"].sum() + matches[
        (matches["away_team"] == team1)
    ]["away_score"].sum()

    team2_goals = matches[
        (matches["home_team"] == team2)
    ]["home_score"].sum() + matches[
        (matches["away_team"] == team2)
    ]["away_score"].sum()

    # -- matches list (chronological) --
    matches_sorted = matches.sort_values("date")
    matches_list = []
    for _, row in matches_sorted.iterrows():
        matches_list.append({
            "date": str(row["date"]),
            "home_team": row["home_team"],
            "away_team": row["away_team"],
            "home_score": int(row["home_score"]),
            "away_score": int(row["away_score"]),
            "tournament": row.get("tournament"),
            "city": row.get("city"),
            "country": row.get("country"),
            "neutral": bool(row.get("neutral", False)) if "neutral" in row.index else None,
        })

    result = {
        "team1": team1,
        "team2": team2,
        "matches": len(matches),
        f"{team1}_wins": team1_wins,
        f"{team2}_wins": team2_wins,
        "draws": draws,
        f"{team1}_goals": int(team1_goals),
        f"{team2}_goals": int(team2_goals),
        "matches_list": matches_list,
    }

    # -- Biggest wins (top 3 by goal margin for each team) --
    def _biggest_wins(team: str, n: int = 3) -> list[dict]:
        """Return the top N victories by goal margin for `team` against the other."""
        team_matches = matches[
            ((matches["home_team"] == team) & (matches["home_score"] > matches["away_score"]))
            | ((matches["away_team"] == team) & (matches["away_score"] > matches["home_score"]))
        ].copy()
        if team_matches.empty:
            return []
        team_matches["goal_margin"] = team_matches.apply(
            lambda r: abs(r["home_score"] - r["away_score"]), axis=1
        )
        top = team_matches.nlargest(n, "goal_margin")
        return [
            {
                "date": str(row["date"]),
                "home_team": row["home_team"],
                "away_team": row["away_team"],
                "home_score": int(row["home_score"]),
                "away_score": int(row["away_score"]),
                "goal_margin": int(row["goal_margin"]),
                "tournament": row.get("tournament"),
            }
            for _, row in top.iterrows()
        ]

    result[f"{team1}_biggest_wins"] = _biggest_wins(team1)
    result[f"{team2}_biggest_wins"] = _biggest_wins(team2)

    # Add advanced goal stats if there are matches between the two teams
    total_h2h_matches = len(matches)
    if total_h2h_matches > 0:
        # Total goals per match in these head-to-heads
        h2h_total_goals = matches["home_score"] + matches["away_score"]
        result["total_goals_per_match_stats"] = series_stats(h2h_total_goals)

    return result


# ---------------------------------------------------------------------------
#  Team aggregate (for /most/{stat})
# ---------------------------------------------------------------------------


def _team_aggregate(results: pd.DataFrame) -> pd.DataFrame:
    """Compute per-team aggregate stats (wins, losses, draws, goals, rates)."""
    if results.empty:
        return pd.DataFrame()

    home = results[["home_team", "home_score", "away_score"]].copy()
    home.columns = ["team", "goals_for", "goals_against"]

    away = results[["away_team", "away_score", "home_score"]].copy()
    away.columns = ["team", "goals_for", "goals_against"]

    combined = pd.concat([home, away], ignore_index=True)

    agg = combined.groupby("team").agg(
        matches_played=("goals_for", "count"),
        goals_for=("goals_for", "sum"),
        goals_against=("goals_against", "sum"),
    ).reset_index()

    hw = results[results["home_score"] > results["away_score"]].groupby("home_team").size()
    aw = results[results["away_score"] > results["home_score"]].groupby("away_team").size()
    hl = results[results["home_score"] < results["away_score"]].groupby("home_team").size()
    al = results[results["away_score"] < results["home_score"]].groupby("away_team").size()
    hd = results[results["home_score"] == results["away_score"]].groupby("home_team").size()
    ad = results[results["home_score"] == results["away_score"]].groupby("away_team").size()

    def _safe_add(s1, s2):
        return s1.add(s2, fill_value=0)

    wins = _safe_add(hw, aw)
    losses = _safe_add(hl, al)
    draws = _safe_add(hd, ad)

    agg = agg.merge(wins.rename("wins"), left_on="team", right_index=True, how="left")
    agg = agg.merge(losses.rename("losses"), left_on="team", right_index=True, how="left")
    agg = agg.merge(draws.rename("draws"), left_on="team", right_index=True, how="left")

    agg = agg.fillna(0)
    for col in ["wins", "losses", "draws"]:
        agg[col] = agg[col].astype(int)

    agg["points"] = agg["wins"] * 3 + agg["draws"] * 1
    agg["win_rate"] = round(agg["wins"] / agg["matches_played"] * 100, 2)
    agg["loss_rate"] = round(agg["losses"] / agg["matches_played"] * 100, 2)

    # Count distinct countries each team has played in
    if "country" in results.columns:
        home_countries = results[["home_team", "country"]].copy()
        home_countries.columns = ["team", "country"]
        away_countries = results[["away_team", "country"]].copy()
        away_countries.columns = ["team", "country"]
        all_countries = pd.concat([home_countries, away_countries], ignore_index=True)
        unique_countries = all_countries.groupby("team")["country"].nunique()
        agg = agg.merge(unique_countries.rename("unique_countries"), left_on="team", right_index=True, how="left")
        agg["unique_countries"] = agg["unique_countries"].fillna(0).astype(int)

    return agg


def teams_list(results: pd.DataFrame) -> list:
    """Return all teams with full aggregate stats."""
    if results.empty:
        return []
    agg = _team_aggregate(results)
    if agg.empty:
        return []
    result = agg.sort_values("matches_played", ascending=False)
    for int_col in ["wins", "losses", "draws", "goals_for", "goals_against", "matches_played", "points"]:
        if int_col in result.columns:
            result[int_col] = result[int_col].astype(int)
    if "unique_countries" in result.columns:
        result["unique_countries"] = result["unique_countries"].astype(int)
    return result.to_dict(orient="records")


def most_teams(results: pd.DataFrame, stat: str, top_n: int = 20) -> list:
    """Top N teams by a given aggregate stat, returning all aggregate stats."""
    if results.empty:
        return []

    if stat not in _MOST_TEAM_STATS:
        valid = ", ".join(_MOST_TEAM_STATS)
        raise ValueError(f"Unknown stat '{stat}'. Valid: {valid}")

    col = _MOST_TEAM_STATS[stat]
    agg = _team_aggregate(results)

    if agg.empty:
        return []

    if stat in ("win_rate", "loss_rate"):
        agg = agg[agg["matches_played"] >= _MIN_MATCHES_FOR_RATES]

    # Sort by requested stat and return ALL aggregate columns
    # so clients can show wins/losses/draws/rates regardless of sort key
    result = agg.nlargest(top_n, col).copy()

    # Ensure integer columns are proper int type
    for int_col in ["wins", "losses", "draws", "goals_for", "goals_against", "matches_played", "points"]:
        if int_col in result.columns:
            result[int_col] = result[int_col].astype(int)

    return result.to_dict(orient="records")
