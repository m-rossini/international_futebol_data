"""Shared DataFrame enrichment helpers used across all analysis modules."""

import unicodedata

import pandas as pd


def strip_accents(text: str) -> str:
    """Remove diacritics/accents from text for fuzzy matching."""
    nfkd = unicodedata.normalize("NFKD", text)
    return "".join(c for c in nfkd if not unicodedata.category(c).startswith("M"))


def enrich_match_results(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived columns to a match results DataFrame.

    Adds: ``year``, ``total_goals``, ``home_win``, ``away_win``, ``draw``,
    ``goal_diff`` (absolute goal difference), ``winner`` (winning team or None).
    Returns a new DataFrame (copy).
    """
    result = df.copy()
    result["year"] = result["date"].dt.year
    result["total_goals"] = result["home_score"] + result["away_score"]
    result["home_win"] = result["home_score"] > result["away_score"]
    result["away_win"] = result["away_score"] > result["home_score"]
    result["draw"] = result["home_score"] == result["away_score"]
    result["goal_diff"] = abs(result["home_score"] - result["away_score"])

    def _winner(row):
        if row["home_score"] > row["away_score"]:
            return row["home_team"]
        elif row["away_score"] > row["home_score"]:
            return row["away_team"]
        return None

    result["winner"] = result.apply(_winner, axis=1)
    return result
