"""Match-level aggregate endpoints: summary, biggest wins, goals per year."""

import logging

from fastapi import APIRouter, Depends, Query

from football_stats.routers.dependencies import (
    FilterParamsDep,
    get_engine,
    require_data,
)
from football_stats.stats.engine import QueryEngine
from football_stats.stats.models import (
    BiggestWinItem,
    GoalsPerYearItem,
    SummaryResponse,
)

logger = logging.getLogger("stats.server.matches")

router = APIRouter(tags=["Matches"])


@router.get("/summary", response_model=SummaryResponse)
async def summary(
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """General dataset overview. Optional filters: ``?tournaments=Friendly&countries=Brazil&date_from=2000-01-01``"""
    logger.debug("GET /summary")
    return engine.summary(filters.inner)


@router.get("/biggest_wins", response_model=list[BiggestWinItem])
async def biggest_wins_endpoint(
    top_n: int = Query(10, ge=1, le=200),
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """Biggest wins by goal margin. Optional filters: ``?tournaments=FIFA+World+Cup&countries=Germany``"""
    logger.debug("GET /biggest_wins?top_n=%d", top_n)
    return engine.biggest_wins(top_n, filters.inner)


@router.get("/goals_per_year", response_model=list[GoalsPerYearItem])
async def goals_per_year_endpoint(
    sort_by: str = Query(
        "goals", description="Sort field: 'year', 'goals', or 'ratio'"
    ),
    order: str = Query("desc", description="Sort order: 'asc' or 'desc' (default)"),
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """Total goals and average goals per match per calendar year.

    Query params:
    - sort_by: ``year`` | ``goals`` (default) | ``ratio``
    - order: ``asc`` | ``desc`` (default)

    Optional filters: ``?tournaments=Friendly&date_from=2000``
    """
    logger.debug("GET /goals_per_year?sort_by=%s&order=%s", sort_by, order)
    return engine.goals_per_year(sort_by=sort_by, order=order, filters=filters.inner)


@router.get("/matchgoals")
async def match_goalscorers_endpoint(
    date: str = Query(..., description="Match date (YYYY-MM-DD)"),
    home_team: str = Query(..., description="Home team name"),
    away_team: str = Query(..., description="Away team name"),
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
):
    """Goalscorers and shootout info for a specific match."""
    logger.debug(
        "GET /matchgoals?date=%s&home_team=%s&away_team=%s", date, home_team, away_team
    )
    return engine.match_goalscorers(date, home_team, away_team)
