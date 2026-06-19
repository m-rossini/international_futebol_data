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

    result = {
        "team1": team1,
        "team2": team2,
        "matches": len(matches),
        f"{team1}_wins": team1_wins,
        f"{team2}_wins": team2_wins,
        "draws": draws,
        f"{team1}_goals": int(team1_goals),
        f"{team2}_goals": int(team2_goals),
    }

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

    agg["win_rate"] = round(agg["wins"] / agg["matches_played"] * 100, 2)
    agg["loss_rate"] = round(agg["losses"] / agg["matches_played"] * 100, 2)

    return agg


def most_teams(results: pd.DataFrame, stat: str, top_n: int = 20) -> list:
    """Top N teams by a given aggregate stat."""
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

    result = agg.nlargest(top_n, col)[["team", col]].to_dict(orient="records")
    if col in ("goals_for", "goals_against", "matches_played"):
        for row in result:
            row[col] = int(row[col])
    return result
