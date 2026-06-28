"""Winner and biggest-win logic shared across analysis modules."""

from typing import Optional

import pandas as pd

from .enrich import enrich_match_results


def biggest_wins_in_df(df: pd.DataFrame, top_n: int = 10) -> list:
    """Return the top_n biggest goal margins from a DataFrame.

    Enriches the dataframe automatically (adds ``goal_diff`` etc.)
    Returns a ranked list of dicts.
    """
    df = enrich_match_results(df)

    top = df.nlargest(top_n, "goal_diff")[
        [
            "date",
            "home_team",
            "away_team",
            "home_score",
            "away_score",
            "tournament",
            "city",
            "country",
        ]
    ]
    records = top.to_dict(orient="records")
    for i, r in enumerate(records):
        r["rank"] = i + 1
        r["date"] = str(r["date"].date())
        r["goal_diff"] = int(abs(r["home_score"] - r["away_score"]))
        r["home_score"] = int(r["home_score"])
        r["away_score"] = int(r["away_score"])
    return records


def biggest_single_win(df: pd.DataFrame) -> Optional[dict]:
    """Return a formatted dict for the single biggest win, or None."""
    if df.empty:
        return None
    biggest = df.nlargest(1, "goal_diff").iloc[0]
    return {
        "date": str(biggest["date"].date()),
        "home_team": biggest["home_team"],
        "away_team": biggest["away_team"],
        "home_score": int(biggest["home_score"]),
        "away_score": int(biggest["away_score"]),
    }
