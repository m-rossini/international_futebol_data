"""Team-related endpoints: team stats, head-to-head, top scorers."""

import logging

from fastapi import APIRouter, Depends, Query

from .dependencies import FilterParamsDep, engine, require_data
from stats.models import TopScorersResponse

logger = logging.getLogger("stats.server.teams")

router = APIRouter(tags=["Teams"])


@router.get("/team/{team_name}")
async def team_stats(team_name: str, filters: FilterParamsDep = Depends()):
    """Stats for a specific national team. Optional filters: ``?tournaments=FIFA+World+cup``"""
    require_data()
    logger.debug("GET /team/%s", team_name)
    return engine.team(team_name, filters.inner)


@router.get("/head_to_head")
async def head_to_head(
    team1: str = Query(...),
    team2: str = Query(...),
    filters: FilterParamsDep = Depends(),
):
    """Head-to-head stats between two teams. Optional filters apply to matches considered."""
    require_data()
    logger.debug("GET /head_to_head?team1=%s&team2=%s", team1, team2)
    return engine.head_to_head(team1, team2, filters.inner)


@router.get("/top_scorers", response_model=TopScorersResponse)
async def top_scorers_endpoint(top_n: int = Query(20, ge=1, le=200)):
    """Top N goal scorers of all time. (No tournament/country filtering — scorers data lacks these columns.)"""
    require_data()
    logger.debug("GET /top_scorers?top_n=%d", top_n)
    return engine.top_scorers(top_n)
