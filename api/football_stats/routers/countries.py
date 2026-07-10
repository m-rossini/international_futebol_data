"""Country endpoints: list all countries, country detail."""

import logging

from fastapi import APIRouter, Depends

from football_stats.routers.dependencies import (
    FilterParamsDep,
    get_engine,
    require_data,
)
from football_stats.stats.engine import QueryEngine
from football_stats.stats.models import CountryListItem

logger = logging.getLogger("stats.server.countries")

router = APIRouter(tags=["Countries"])


@router.get("/countries", response_model=list[CountryListItem])
async def countries_endpoint(
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """List all countries with comprehensive stats.
    Optional filters: ``?tournaments=FIFA+World+Cup``"""
    logger.debug("GET /countries")
    return engine.countries(filters.inner)


@router.get("/country/{country_name}")
async def country_endpoint(
    country_name: str,
    engine: QueryEngine = Depends(get_engine),
    _: None = Depends(require_data),
    filters: FilterParamsDep = Depends(),
):
    """Comprehensive stats for a specific country.
    Optional filters: ``?tournaments=Friendly&date_from=2010``"""
    logger.debug("GET /country/%s", country_name)
    return engine.country(country_name, filters.inner)
