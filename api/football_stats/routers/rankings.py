"""Ranking endpoint: /most/{stat} for teams, countries, and cities."""

import logging

from fastapi import APIRouter, Depends, Query

from .dependencies import FilterParamsDep, MostStat, engine, require_data
from stats.models import TeamRankingResponse

logger = logging.getLogger("stats.server.rankings")

router = APIRouter(tags=["Rankings"])


@router.get("/most/{stat}", response_model=TeamRankingResponse)
async def most_endpoint(
    stat: MostStat,
    top_n: int = Query(20, ge=1, le=500),
    filters: FilterParamsDep = Depends(),
):
    """Ranking of top N by a stat. Optional filters: ``?tournaments=FIFA+World+Cup&date_from=2000``"""
    require_data()
    logger.debug("GET /most/%s?top_n=%d", stat.value, top_n)
    return engine.most(stat.value, top_n, filters.inner)
