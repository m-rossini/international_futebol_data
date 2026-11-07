"""Squad endpoints: list matches with squad data, squad detail."""

import logging

from fastapi import APIRouter, Depends, Query, Path

from football_stats.routers.dependencies import FilterParamsDep, engine, require_data
from football_stats.stats.models import (
    ErrorResponse,
    SquadDetailResponse,
    SquadMatchItem,
)

logger = logging.getLogger("stats.server.squads")

router = APIRouter(tags=["Squads"])


@router.get("/squads", response_model=list[SquadMatchItem])
async def squads_endpoint(
    limit: int = Query(50, ge=1, le=500, description="Matches per page"),
    offset: int = Query(0, ge=0, description="Matches to skip"),
    filters: FilterParamsDep = Depends(),
):
    """List matches that have squad data, newest first.
    Optional filters: ``?teams=Brazil``"""
    require_data()
    logger.debug("GET /squads")
    all_matches = engine.squad_matches(filters.inner)
    return all_matches[offset : offset + limit]


@router.get(
    "/squads/{match_date}/{home_team}/{away_team}",
    response_model=SquadDetailResponse | ErrorResponse,
)
async def squad_endpoint(
    match_date: str = Path(..., description="Match date YYYY-MM-DD"),
    home_team: str = Path(..., description="Home team name"),
    away_team: str = Path(..., description="Away team name"),
    filters: FilterParamsDep = Depends(),
):
    """Squad detail for a specific match."""
    require_data()
    logger.debug("GET /squads/%s/%s/%s", match_date, home_team, away_team)
    return engine.squad(match_date, home_team, away_team, filters.inner)
