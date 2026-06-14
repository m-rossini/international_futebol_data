"""Goals and scoring related analysis."""

import pandas as pd


def goals_per_year(
    results: pd.DataFrame,
    sort_by: str = "goals",
    order: str = "desc",
) -> list:
    """Total goals and average goals per match per year.

    Parameters
    ----------
    sort_by : str
        Column to sort by -- ``"year"``, ``"goals"``, or ``"ratio"`` (avg goals).
    order : str
        ``"asc"`` (ascending) or ``"desc"`` (descending, default).

    Returns
    -------
    list[dict]
        Each record: ``{"year": int, "goals": int, "matches": int, "avg_goals": float}``
    """
    if sort_by not in ("year", "goals", "ratio"):
        raise ValueError(f"Invalid sort_by '{sort_by}'. Use 'year', 'goals', or 'ratio'.")
    if order not in ("asc", "desc"):
        raise ValueError(f"Invalid order '{order}'. Use 'asc' or 'desc'.")

    if results.empty:
        return []

    df = results.copy()
    df["year"] = df["date"].dt.year
    df["total_goals"] = df["home_score"] + df["away_score"]

    agg = df.groupby("year").agg(
        goals=("total_goals", "sum"),
        matches=("total_goals", "count"),
    ).reset_index()

    agg["avg_goals"] = round(agg["goals"] / agg["matches"], 2)

    col_map = {"year": "year", "goals": "goals", "ratio": "avg_goals"}
    sort_col = col_map[sort_by]
    ascending = order == "asc"

    agg = agg.sort_values(sort_col, ascending=ascending).reset_index(drop=True)

    result = []
    for _, row in agg.iterrows():
        result.append({
            "year": int(row["year"]),
            "goals": int(row["goals"]),
            "matches": int(row["matches"]),
            "avg_goals": float(row["avg_goals"]),
        })
    return result


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
