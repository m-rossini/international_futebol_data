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
    # Drop fixtures with no score data (scheduled but not yet played)
    before = len(result)
    result = result.dropna(subset=["home_score", "away_score"])
    if before != len(result):
        import logging
        logging.getLogger("enrich").debug("Dropped %d rows with NaN scores", before - len(result))
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


def build_shootout_lookup(shootouts: pd.DataFrame) -> set[tuple[str, str, str]]:
    """Build a set of ``(date_str, home_team, away_team)`` tuples for fast
    shootout lookups. Date strings are normalised to ``YYYY-MM-DD`` (10 chars)."""
    lookup: set[tuple[str, str, str]] = set()
    if shootouts.empty:
        return lookup
    for _, row in shootouts.iterrows():
        ds = str(row["date"]).strip()[:10]  # trim time portion if present
        ht = str(row["home_team"]).strip()
        at = str(row["away_team"]).strip()
        if ds and ht and at:
            lookup.add((ds, ht, at))
    return lookup


def mark_shootouts(
    matches_list: list[dict],
    shootouts_lookup: set[tuple[str, str, str]],
) -> list[dict]:
    """Add ``shootout=True`` to each match dict whose (date, home_team, away_team)
    appears in the shootouts lookup set. Operates in-place and also returns
    the same list for convenience."""
    for m in matches_list:
        date_key = str(m["date"]).strip()
        if len(date_key) > 10:
            date_key = date_key[:10]  # trim time portion if present
        key = (date_key, m["home_team"], m["away_team"])
        if key in shootouts_lookup:
            m["shootout"] = True
    return matches_list
