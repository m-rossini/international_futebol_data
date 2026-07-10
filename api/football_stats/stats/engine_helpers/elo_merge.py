"""ELO enrichment of team-list results."""

from __future__ import annotations

from typing import Any, Optional

import pandas as pd

from ..elo import calculate_elo_for_filters, get_latest_elo
from ..filters import FilterParams


def merge_elo(
    teams: list[dict],
    results: pd.DataFrame,
    filters: Optional[FilterParams],
    elo_ratings: pd.DataFrame | None,
    elo_config: Any,
) -> list[dict]:
    """Add ``elo_rating`` and ``elo_ranking`` to each team dict.

    When filters are active, ELO is recomputed from the filtered match
    subset so that ratings and rankings reflect the selected scope
    (tournament, date range, countries, etc.).
    """
    if filters is None or filters.is_empty:
        elo_history = elo_ratings
    else:
        elo_history = calculate_elo_for_filters(results, filters, elo_config=elo_config)

    if elo_history is None or elo_history.empty:
        for t in teams:
            t["elo_rating"] = None
            t["elo_ranking"] = None
        return teams

    latest = get_latest_elo(elo_history, top_n=500)
    elo_lookup: dict[str, dict] = {}
    for _, row in latest.iterrows():
        elo_lookup[row["team"]] = {
            "elo_rating": round(row["elo_rating"]),
            "elo_ranking": int(row["ranking"]),
        }

    for t in teams:
        elo = elo_lookup.get(t["team"])
        if elo:
            t["elo_rating"] = elo["elo_rating"]
            t["elo_ranking"] = elo["elo_ranking"]
        else:
            t["elo_rating"] = None
            t["elo_ranking"] = None

    return teams
