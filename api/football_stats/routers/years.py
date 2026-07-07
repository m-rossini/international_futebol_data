"""Year endpoints: list all years, year detail."""

import logging

from fastapi import APIRouter, Depends

from football_stats.routers.dependencies import FilterParamsDep, engine, require_data
from football_stats.stats.models import YearOverviewItem, YearDetailResponse

logger = logging.getLogger("stats.server.years")

router = APIRouter(tags=["Years"])


@router.get("/years", response_model=list[YearOverviewItem])
async def years_endpoint(filters: FilterParamsDep = Depends()):
    """List all years with aggregate stats (matches, goals, countries, cities).
    Optional filters: ``?tournaments=FIFA+World+Cup&countries=Brazil``"""
    require_data()
    logger.debug("GET /years")
    return engine.years(filters.inner)


@router.get("/years/{year}", response_model=YearDetailResponse)
async def year_detail_endpoint(year: int, filters: FilterParamsDep = Depends()):
    """Detailed stats for a specific year, with full match list.
    Optional filters: ``?tournaments=FIFA+World+Cup``"""
    require_data()
    logger.debug("GET /years/%d", year)
    return engine.year_detail(year, filters.inner)
