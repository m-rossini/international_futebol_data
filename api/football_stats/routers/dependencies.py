"""Shared dependencies: app-state providers, guards, filter-param extraction."""

from __future__ import annotations

import json
import os
from enum import Enum
from typing import Optional

from fastapi import Depends, HTTPException, Query, Request

from football_stats.llm.service import ConversationService
from football_stats.stats.analysis.ranking import STAT_LABELS, VALID_STATS
from football_stats.stats.engine import QueryEngine
from football_stats.stats.filters import FilterParams, build_filters
from football_stats.stats.state import DataState

# ---------------------------------------------------------------------------
#  App-state providers (populated by server.py lifespan)
# ---------------------------------------------------------------------------


def get_state(request: Request) -> DataState:
    """Return the application ``DataState`` (set during lifespan)."""
    return request.app.state.state


def get_engine(request: Request) -> QueryEngine:
    """Return the application ``QueryEngine`` (set during lifespan)."""
    return request.app.state.engine


def get_conversation_service(request: Request) -> ConversationService | None:
    """Return the LLM conversation service, or ``None`` if not configured."""
    return getattr(request.app.state, "conversation_service", None)


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
    except FileNotFoundError | json.JSONDecodeError:
        return "unknown"


# ---------------------------------------------------------------------------
#  Guard
# ---------------------------------------------------------------------------
def require_data(state: DataState = Depends(get_state)) -> None:
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
        # build_filters returns None when empty; the router contract expects a
        # (possibly empty) FilterParams object so callers can access .inner
        # attributes unconditionally. The engine treats an empty FilterParams
        # the same as None.
        self._inner = (
            build_filters(
                teams=teams,
                tournaments=tournaments,
                countries=countries,
                date_from=date_from,
                date_to=date_to,
            )
            or FilterParams()
        )

    @property
    def inner(self) -> FilterParams:
        return self._inner


# ---------------------------------------------------------------------------
#  Shared constants used by both meta.py (root endpoint) and rankings.py
# ---------------------------------------------------------------------------


# MostStat is derived from the single stat registry in
# ``football_stats.stats.analysis.ranking`` so the API surface and the
# engine's validation can never drift apart.
MostStat = Enum(
    "MostStat",
    {s: s for s in sorted(VALID_STATS)},
    type=str,
)

# Human-readable labels for the valid stats (single source in ranking.py).
_MOST_VALID_STATS = STAT_LABELS
