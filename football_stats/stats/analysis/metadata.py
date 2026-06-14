"""Metadata / summary functions for each dataset."""

from typing import Optional

import pandas as pd

from .enrich import enrich_match_results


def total_matches(results: pd.DataFrame) -> int:
    return len(results)


def date_range(results: pd.DataFrame) -> tuple:
    if results.empty:
        return None, None
    return results["date"].min(), results["date"].max()


def tournaments_available(results: pd.DataFrame) -> pd.Series:
    return results["tournament"].value_counts()


def most_common_tournament(results: pd.DataFrame) -> Optional[str]:
    if results.empty:
        return None
    return results["tournament"].mode().iloc[0]


def home_advantage(results: pd.DataFrame) -> dict:
    """Calculate home win/draw/loss percentages."""
    total = len(results)
    if total == 0:
        return {
            "total_matches": 0, "home_wins": 0, "home_win_pct": 0,
            "draws": 0, "draw_pct": 0, "away_wins": 0, "away_win_pct": 0,
        }
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


def results_metadata(results: pd.DataFrame) -> dict:
    """Metadata about the results dataset."""
    dr = date_range(results)
    return {
        "total_matches": total_matches(results),
        "date_range": {
            "from": str(dr[0].date()) if dr[0] is not None else None,
            "to": str(dr[1].date()) if dr[1] is not None else None,
        },
        "tournaments_count": len(tournaments_available(results)),
        "most_common_tournament": most_common_tournament(results),
        "unique_home_teams": int(results["home_team"].nunique()) if not results.empty else 0,
        "unique_away_teams": int(results["away_team"].nunique()) if not results.empty else 0,
        "total_goals": int(results["home_score"].sum() + results["away_score"].sum()),
        "avg_goals_per_match": round(
            float(results["home_score"].sum() + results["away_score"].sum()) / len(results), 2
        ) if not results.empty else 0,
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


def shootout_stats(shootouts: pd.DataFrame) -> dict:
    """Basic shootout statistics."""
    winner_counts = shootouts["winner"].value_counts().head(20)
    return {
        "total_shootouts": len(shootouts),
        "most_shootout_wins": winner_counts,
    }
