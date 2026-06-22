"""Tournament endpoints: list all tournaments, tournament detail."""

import logging

from fastapi import APIRouter, Depends

from .dependencies import FilterParamsDep, engine, require_data
from stats.models import TournamentListItem

logger = logging.getLogger("stats.server.tournaments")

router = APIRouter(tags=["Tournaments"])


@router.get("/tournaments", response_model=list[TournamentListItem])
async def tournaments_endpoint(filters: FilterParamsDep = Depends()):
    """List all tournaments with comprehensive stats (matches, goals, years, teams).
    Optional filters: ``?countries=Brazil&date_from=2000``"""
    require_data()
    logger.debug("GET /tournaments")
    return engine.tournaments(filters.inner)


@router.get("/tournament/{tournament_name}")
async def tournament_endpoint(tournament_name: str, filters: FilterParamsDep = Depends()):
    """Comprehensive stats for a specific tournament, with yearly breakdown.
    Optional filters: ``?countries=Germany&date_from=1990``"""
    require_data()
    logger.debug("GET /tournament/%s", tournament_name)
    return engine.tournament(tournament_name, filters.inner)


@router.get("/tournament/{tournament_name}/season/{year}")
async def season_endpoint(tournament_name: str, year: int, filters: FilterParamsDep = Depends()):
    """Detailed stats for a specific tournament edition (season).
    Returns match list, team standings, and edition summary.
    Optional filters: ``?countries=Germany``"""
    require_data()
    logger.debug("GET /tournament/%s/season/%d", tournament_name, year)
    return engine.season(tournament_name, year, filters.inner)
