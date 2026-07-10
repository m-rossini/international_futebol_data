"""Year endpoints: list all years, year detail."""

import logging

from fastapi import APIRouter, Depends

from football_stats.routers.dependencies import (
    FilterParamsDep,
    get_engine,
    require_data,
)
from football_stats.stats.engine import QueryEngine
from football_stats.stats.models import YearOverviewItem

logger = logging.getLogger("stats.server.years")

router = APIRouter(tags=["Years"])


@router.get("/years", response_model=list[YearOverviewItem])
async def years_endpoint(
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """List all years with aggregate stats (matches, goals, countries, cities).
    Optional filters: ``?tournaments=FIFA+World+Cup&countries=Brazil``"""
    logger.debug("GET /years")
    return engine.years(filters.inner)


@router.get("/years/{year}")
async def year_detail_endpoint(
    year: int,
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """Detailed stats for a specific year, with full match list.
    Optional filters: ``?tournaments=FIFA+World+Cup``"""
    logger.debug("GET /years/%d", year)
    return engine.year_detail(year, filters.inner)
