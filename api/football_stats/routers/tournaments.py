"""Tournament endpoints: list all tournaments, tournament detail."""

import logging

from fastapi import APIRouter, Depends

from football_stats.routers.dependencies import (
    FilterParamsDep,
    get_engine,
    require_data,
)
from football_stats.stats.engine import QueryEngine
from football_stats.stats.models import TournamentListItem

logger = logging.getLogger("stats.server.tournaments")

router = APIRouter(tags=["Tournaments"])


@router.get("/tournaments", response_model=list[TournamentListItem])
async def tournaments_endpoint(
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """List all tournaments with comprehensive stats (matches, goals, years, teams).
    Optional filters: ``?countries=Brazil&date_from=2000``"""
    logger.debug("GET /tournaments")
    return engine.tournaments(filters.inner)


@router.get("/tournament/{tournament_name}")
async def tournament_endpoint(
    tournament_name: str,
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """Comprehensive stats for a specific tournament, with yearly breakdown.
    Optional filters: ``?countries=Germany&date_from=1990``"""
    logger.debug("GET /tournament/%s", tournament_name)
    return engine.tournament(tournament_name, filters.inner)


@router.get("/tournament/{tournament_name}/season/{year}")
async def season_endpoint(
    tournament_name: str,
    year: int,
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """Detailed stats for a specific tournament edition (season).
    Returns match list, team standings, and edition summary.
    Optional filters: ``?countries=Germany``"""
    logger.debug("GET /tournament/%s/season/%d", tournament_name, year)
    return engine.season(tournament_name, year, filters.inner)
