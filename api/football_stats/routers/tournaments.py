"""Tournament endpoints: list all tournaments, tournament detail."""

import logging

from fastapi import APIRouter, Depends, Query

from football_stats.stats.models import (
    ErrorResponse,
    SeasonInfoResponse,
)
from football_stats.routers.dependencies import FilterParamsDep, engine, require_data
from football_stats.stats.models import (
    TournamentInfoResponse,
    TournamentListItem,
    TournamentMatchesResponse,
)

logger = logging.getLogger("stats.server.tournaments")

router = APIRouter(tags=["Tournaments"])


@router.get("/tournaments", response_model=list[TournamentListItem])
async def tournaments_endpoint(filters: FilterParamsDep = Depends()):
    """List all tournaments with comprehensive stats (matches, goals, years, teams).
    Optional filters: ``?countries=Brazil&date_from=2000``"""
    require_data()
    logger.debug("GET /tournaments")
    return engine.tournaments(filters.inner)


@router.get(
    "/tournament/{tournament_name}",
    response_model=TournamentInfoResponse | ErrorResponse,
)
async def tournament_endpoint(
    tournament_name: str, filters: FilterParamsDep = Depends()
):
    """Comprehensive stats for a specific tournament, with yearly breakdown.
    Optional filters: ``?countries=Germany&date_from=1990``"""
    require_data()
    logger.debug("GET /tournament/%s", tournament_name)
    return engine.tournament(tournament_name, filters.inner)


@router.get(
    "/tournament/{tournament_name}/matches",
    response_model=TournamentMatchesResponse | ErrorResponse,
)
async def tournament_matches_endpoint(
    tournament_name: str,
    year: int | None = Query(None, description="Restrict to a single edition"),
    limit: int = Query(50, ge=1, le=200, description="Matches per page"),
    offset: int = Query(0, ge=0, description="Matches to skip"),
    filters: FilterParamsDep = Depends(),
):
    """Paginated match list for a tournament, newest first.
    Optional filters: ``?year=2022&limit=50&offset=0``"""
    require_data()
    logger.debug("GET /tournament/%s/matches", tournament_name)
    return engine.tournament_matches(
        tournament_name,
        filters.inner,
        year=year,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/tournament/{tournament_name}/season/{year}",
    response_model=SeasonInfoResponse | ErrorResponse,
)
async def season_endpoint(
    tournament_name: str, year: int, filters: FilterParamsDep = Depends()
):
    """Detailed stats for a specific tournament edition (season).
    Returns match list, team standings, and edition summary.
    Optional filters: ``?countries=Germany``"""
    require_data()
    logger.debug("GET /tournament/%s/season/%d", tournament_name, year)
    return engine.season(tournament_name, year, filters.inner)
