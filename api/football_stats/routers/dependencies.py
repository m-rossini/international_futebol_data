"""Shared dependencies: app state, query engine, guards, filter-param extraction."""

from __future__ import annotations

import json
import os
from enum import Enum
from typing import Optional

from fastapi import HTTPException, Query

from football_stats.stats.state import DataState
from football_stats.stats.engine import QueryEngine
from football_stats.stats.filters import FilterParams

# ---------------------------------------------------------------------------
#  Shared state & engine (created once, imported by all routers)
# ---------------------------------------------------------------------------
state = DataState()
engine = QueryEngine(state)

# ---------------------------------------------------------------------------
#  Config helpers
# ---------------------------------------------------------------------------
_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "config.json")


def load_version() -> str:
    """Read the version string from config.json."""
    try:
        with open(_CONFIG_PATH) as f:
            cfg = json.load(f)
        return cfg.get("version", "unknown")
    except (FileNotFoundError, json.JSONDecodeError):
        return "unknown"


# ---------------------------------------------------------------------------
#  Guard
# ---------------------------------------------------------------------------
def require_data() -> None:
    """Raise HTTP 503 if data has not been loaded yet."""
    if not state.is_loaded:
        raise HTTPException(503, "Data not loaded yet. Call POST /reload first.")


# ---------------------------------------------------------------------------
#  FilterParams FastAPI dependency
# ---------------------------------------------------------------------------
class FilterParamsDep:
    """FastAPI dependency that parses filter query params into a ``FilterParams``.

    Usage::

        @router.get("/something")
        def handler(filters: FilterParamsDep = Depends()):
            df = apply_filters(state.results, filters.inner)
    """

    def __init__(
        self,
        teams: Optional[list[str]] = Query(
            None, description="Filter by team name (can repeat or be comma-separated)"
        ),
        tournaments: Optional[list[str]] = Query(
            None,
            description="Filter by tournament name (can repeat or be comma-separated)",
        ),
        countries: Optional[list[str]] = Query(
            None,
            description="Filter by host country (can repeat or be comma-separated)",
        ),
        date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
        date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    ):
        def _split(v: Optional[list[str]]) -> Optional[list[str]]:
            """Normalise: split comma-separated strings into a flat list."""
            if v is None:
                return None
            if isinstance(v, str):
                v = [v]
            result: list[str] = []
            for item in v:
                result.extend(s.strip() for s in item.split(",") if s.strip())
            return result or None

        self._inner = FilterParams(
            teams=_split(teams),
            tournaments=_split(tournaments),
            countries=_split(countries),
            date_from=date_from,
            date_to=date_to,
        )

    @property
    def inner(self) -> FilterParams:
        return self._inner


# ---------------------------------------------------------------------------
#  Shared constants used by both meta.py (root endpoint) and rankings.py
# ---------------------------------------------------------------------------


class MostStat(str, Enum):
    """Stat options for the /most/{stat} endpoint."""

    wins = "wins"
    losses = "losses"
    draws = "draws"
    win_rate = "win_rate"
    loss_rate = "loss_rate"
    goals_pro = "goals_pro"
    goals_against = "goals_against"
    matches = "matches"
    country = "country"
    countries = "countries"
    city = "city"
    cities = "cities"


_MOST_VALID_STATS: dict[str, str] = {
    "wins": "Most wins",
    "losses": "Most losses",
    "draws": "Most draws",
    "win_rate": "Highest win rate (min 10 matches)",
    "loss_rate": "Highest loss rate (min 10 matches)",
    "goals_pro": "Most goals scored (goals for)",
    "goals_against": "Most goals conceded",
    "matches": "Most matches played",
    "country": "Most matches hosted by a country",
    "countries": "Alias for 'country'",
    "city": "Most matches hosted by a city",
    "cities": "Alias for 'city'",
}
