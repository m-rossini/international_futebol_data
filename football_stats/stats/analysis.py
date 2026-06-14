"""Statistical analysis functions for international football data."""

import pandas as pd
import numpy as np


def total_matches(results: pd.DataFrame) -> int:
    return len(results)


def date_range(results: pd.DataFrame) -> tuple:
    return results["date"].min(), results["date"].max()


def tournaments_available(results: pd.DataFrame) -> pd.Series:
    return results["tournament"].value_counts()


def most_common_tournament(results: pd.DataFrame) -> str:
    return results["tournament"].mode().iloc[0]


def biggest_wins(results: pd.DataFrame, top_n: int = 10) -> pd.DataFrame:
    """Return the top_n biggest goal margins."""
    results = results.copy()
    results["goal_diff"] = abs(results["home_score"] - results["away_score"])
    return results.nlargest(top_n, "goal_diff")[
        ["date", "home_team", "away_team", "home_score", "away_score", "tournament"]
    ]


def top_scorers(goalscorers: pd.DataFrame, top_n: int = 20) -> pd.Series:
    return goalscorers["scorer"].value_counts().head(top_n)


def top_scorers_by_national_team(
    goalscorers: pd.DataFrame, top_n: int = 20
) -> pd.DataFrame:
    return (
        goalscorers.groupby(["team", "scorer"])
        .size()
        .reset_index(name="goals")
        .sort_values("goals", ascending=False)
        .head(top_n)
    )


def team_win_rate(results: pd.DataFrame, team: str) -> dict:
    """Calculate win/draw/loss stats for a given team."""
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

    return {
        "team": team,
        "matches_played": total,
        "wins": wins,
        "draws": draws,
        "losses": losses,
        "win_rate": round(wins / total * 100, 2) if total else 0,
    }


def goals_per_year(results: pd.DataFrame) -> pd.DataFrame:
    """Total goals scored per year."""
    df = results.copy()
    df["year"] = df["date"].dt.year
    df["total_goals"] = df["home_score"] + df["away_score"]
    return df.groupby("year")["total_goals"].sum().reset_index()


def home_advantage(results: pd.DataFrame) -> dict:
    """Calculate home win/draw/loss percentages."""
    total = len(results)
    home_wins = len(results[results["home_score"] > results["away_score"]])
    draws = len(results[results["home_score"] == results["away_score"]])
    away_wins = len(results[results["home_score"] < results["away_score"]])

    return {
        "total_matches": total,
        "home_wins": home_wins,
        "home_win_pct": round(home_wins / total * 100, 2),
        "draws": draws,
        "draw_pct": round(draws / total * 100, 2),
        "away_wins": away_wins,
        "away_win_pct": round(away_wins / total * 100, 2),
    }


def shootout_stats(shootouts: pd.DataFrame) -> dict:
    """Basic shootout statistics."""
    winner_counts = shootouts["winner"].value_counts().head(20)
    return {
        "total_shootouts": len(shootouts),
        "most_shootout_wins": winner_counts,
    }


def results_metadata(results: pd.DataFrame) -> dict:
    """Metadata about the results dataset."""
    dr = date_range(results)
    return {
        "total_matches": total_matches(results),
        "date_range": {"from": str(dr[0].date()), "to": str(dr[1].date())},
        "tournaments_count": len(tournaments_available(results)),
        "most_common_tournament": most_common_tournament(results),
        "unique_home_teams": int(results["home_team"].nunique()),
        "unique_away_teams": int(results["away_team"].nunique()),
        "total_goals": int(results["home_score"].sum() + results["away_score"].sum()),
        "avg_goals_per_match": round(
            float(results["home_score"].sum() + results["away_score"].sum()) / len(results), 2
        ),
        "home_advantage": home_advantage(results),
    }


def goalscorers_metadata(goalscorers: pd.DataFrame) -> dict:
    """Metadata about the goalscorers dataset."""
    dr = date_range(goalscorers)
    return {
        "total_goals_recorded": len(goalscorers),
        "unique_scorers": int(goalscorers["scorer"].nunique()),
        "unique_teams_scored_for": int(goalscorers["team"].nunique()),
        "date_range": {"from": str(dr[0].date()), "to": str(dr[1].date())},
        "own_goals": int(goalscorers["own_goal"].sum()),
        "penalty_goals": int(goalscorers["penalty"].sum()),
        "top_scorer": goalscorers["scorer"].value_counts().head(1).to_dict(),
    }


def shootouts_metadata(shootouts: pd.DataFrame) -> dict:
    """Metadata about the shootouts dataset."""
    dr = date_range(shootouts)
    return {
        "total_shootouts": len(shootouts),
        "date_range": {"from": str(dr[0].date()), "to": str(dr[1].date())},
        "unique_winners": int(shootouts["winner"].nunique()),
        "most_common_winner": str(shootouts["winner"].mode().iloc[0]) if len(shootouts) else None,
    }


def former_names_metadata(former_names: pd.DataFrame) -> dict:
    """Metadata about the former_names dataset."""
    return {
        "total_renamed_countries": len(former_names),
        "unique_current_names": int(former_names["current"].nunique()),
        "unique_former_names": int(former_names["former"].nunique()),
        "earliest_rename": str(former_names["start_date"].min().date()) if len(former_names) else None,
        "latest_rename": str(former_names["end_date"].max().date()) if len(former_names) else None,
    }


def team_vs_team(results: pd.DataFrame, team1: str, team2: str) -> dict:
    """Head-to-head stats between two teams."""
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

    return {
        "team1": team1,
        "team2": team2,
        "matches": len(matches),
        f"{team1}_wins": team1_wins,
        f"{team2}_wins": team2_wins,
        "draws": draws,
        f"{team1}_goals": int(team1_goals),
        f"{team2}_goals": int(team2_goals),
    }
