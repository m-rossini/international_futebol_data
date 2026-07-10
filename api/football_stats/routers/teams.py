"""Team-related endpoints: team stats, head-to-head, top scorers."""

import logging

from fastapi import APIRouter, Depends, Query

from football_stats.routers.dependencies import (
    FilterParamsDep,
    get_engine,
    require_data,
)
from football_stats.stats.engine import QueryEngine
from football_stats.stats.models import TopScorersResponse

logger = logging.getLogger("stats.server.teams")

router = APIRouter(tags=["Teams"])


@router.get("/teams")
async def teams_list_endpoint(
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """List all teams with full aggregate stats (wins, losses, draws, win_rate, unique_countries, etc.)."""
    logger.debug("GET /teams")
    return engine.teams(filters.inner)


@router.get("/team/{team_name}")
async def team_stats(
    team_name: str,
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """Stats for a specific national team. Optional filters: ``?tournaments=FIFA+World+cup``"""
    logger.info(
        "GET /team/%s tournaments=%s countries=%s date_from=%s date_to=%s",
        team_name,
        filters.inner.tournaments,
        filters.inner.countries,
        filters.inner.date_from,
        filters.inner.date_to,
    )
    return engine.team(team_name, filters.inner)


@router.get("/team/{team_name}/matches/{year}")
async def team_matches_by_year_endpoint(
    team_name: str,
    year: int,
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """All matches for a specific team in a specific year. Accepts filter params."""
    logger.debug("GET /team/%s/matches/%d", team_name, year)
    return engine.team_matches(team_name, year, filters.inner)


@router.get("/head_to_head")
async def head_to_head(
    team1: str = Query(...),
    team2: str = Query(...),
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """Head-to-head stats between two teams. Optional filters apply to matches considered."""
    logger.debug("GET /head_to_head?team1=%s&team2=%s", team1, team2)
    return engine.head_to_head(team1, team2, filters.inner)


@router.get("/top_scorers", response_model=TopScorersResponse)
async def top_scorers_endpoint(
    top_n: int = Query(20, ge=1, le=200),
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
):
    """Top N goal scorers of all time. (No tournament/country filtering — scorers data lacks these columns.)"""
    logger.debug("GET /top_scorers?top_n=%d", top_n)
    return engine.top_scorers(top_n)
