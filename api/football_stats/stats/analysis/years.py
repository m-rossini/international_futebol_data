"""Year-level analysis."""

import pandas as pd

from .enrich import enrich_match_results


def yearly_overview(results: pd.DataFrame) -> list[dict]:
    """Per-year aggregate stats: matches, goals, avg goals, unique countries,
    unique cities, largest margin, most goals in a match, and goals histogram.

    Returns a list of dicts sorted by year descending.
    """
    if results.empty:
        return []

    df = enrich_match_results(results)

    rows: list[dict] = []
    for year, grp in df.groupby("year"):
        countries = pd.concat([grp["home_team"], grp["away_team"]]).nunique()
        cities = grp["city"].nunique() if "city" in grp.columns else 0

        # Goals histogram: frequency of total_goals per match
        hist_series = grp["total_goals"].value_counts().sort_index()
        histogram = {int(k): int(v) for k, v in hist_series.items()}

        rows.append(
            {
                "year": int(year),
                "matches": int(len(grp)),
                "goals": int(grp["total_goals"].sum()),
                "avg_goals": round(float(grp["total_goals"].mean()), 2),
                "countries": int(countries),
                "cities": int(cities),
                "largest_margin": int(grp["goal_diff"].max()),
                "most_goals_match": int(grp["total_goals"].max()),
                "goals_histogram": histogram,
            }
        )

    rows.sort(key=lambda r: r["year"], reverse=True)
    return rows


def yearly_matches(year: int, results: pd.DataFrame) -> list[dict]:
    """Return all matches for a specific year as a list of dicts."""
    if results.empty:
        return []

    df = results.copy()
    df["year"] = df["date"].dt.year
    mask = df["year"] == year
    subset = df.loc[mask].copy()

    if subset.empty:
        return []

    subset = subset.drop(columns=["year"], errors="ignore")
    # Convert date to string for JSON serialization
    subset["date"] = subset["date"].dt.strftime("%Y-%m-%d")
    # Ensure numeric columns are Python native types
    for col in ("home_score", "away_score"):
        if col in subset.columns:
            subset[col] = subset[col].astype(int)

    return subset.to_dict(orient="records")
