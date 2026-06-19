"""Country endpoints: list all countries, country detail."""

import logging

from fastapi import APIRouter, Depends

from .dependencies import FilterParamsDep, engine, require_data
from stats.models import CountryListItem

logger = logging.getLogger("stats.server.countries")

router = APIRouter(tags=["Countries"])


@router.get("/countries", response_model=list[CountryListItem])
async def countries_endpoint(filters: FilterParamsDep = Depends()):
    """List all countries with comprehensive stats.
    Optional filters: ``?tournaments=FIFA+World+Cup``"""
    require_data()
    logger.debug("GET /countries")
    return engine.countries(filters.inner)


@router.get("/country/{country_name}")
async def country_endpoint(country_name: str, filters: FilterParamsDep = Depends()):
    """Comprehensive stats for a specific country.
    Optional filters: ``?tournaments=Friendly&date_from=2010``"""
    require_data()
    logger.debug("GET /country/%s", country_name)
    return engine.country(country_name, filters.inner)
