"""Player endpoints: list all players, player detail."""

import logging

from fastapi import APIRouter, Depends, Query

from football_stats.routers.dependencies import FilterParamsDep, engine, require_data
from football_stats.stats.models import (
    ErrorResponse,
    PlayerDetailResponse,
    PlayerListItem,
)

logger = logging.getLogger("stats.server.players")

router = APIRouter(tags=["Players"])


@router.get("/players", response_model=list[PlayerListItem])
async def players_endpoint(
    filters: FilterParamsDep = Depends(),
    limit: int = Query(50, ge=1, le=500, description="Players per page"),
    offset: int = Query(0, ge=0, description="Players to skip"),
):
    """List all player entities derived from goalscorers.csv.
    Optional filters: ``?teams=Brazil&tournaments=FIFA+World+Cup``"""
    require_data()
    logger.debug("GET /players")
    all_players = engine.players(filters.inner)
    return all_players[offset : offset + limit]


@router.get(
    "/player/{player_name}", response_model=PlayerDetailResponse | ErrorResponse
)
async def player_endpoint(player_name: str, filters: FilterParamsDep = Depends()):
    """Comprehensive stats for a specific player.
    Optional filters: ``?tournaments=FIFA+World+Cup&date_from=2000``"""
    require_data()
    logger.debug("GET /player/%s", player_name)
    return engine.player(player_name, filters.inner)
