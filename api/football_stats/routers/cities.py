"""City endpoints: list all cities, city detail."""

import logging

from fastapi import APIRouter, Depends

from football_stats.routers.dependencies import FilterParamsDep, engine, require_data
from football_stats.stats.models import CityListItem

logger = logging.getLogger("stats.server.cities")

router = APIRouter(tags=["Cities"])


@router.get("/cities", response_model=list[CityListItem])
async def cities_endpoint(filters: FilterParamsDep = Depends()):
    """List all cities with comprehensive stats.
    Optional filters: ``?tournaments=FIFA+World+Cup``"""
    require_data()
    logger.debug("GET /cities")
    return engine.cities(filters.inner)


@router.get("/city/{city_name}")
async def city_endpoint(city_name: str, filters: FilterParamsDep = Depends()):
    """Comprehensive stats for a specific city.
    Optional filters: ``?tournaments=Friendly&date_from=2000``"""
    require_data()
    logger.debug("GET /city/%s", city_name)
    return engine.city(city_name, filters.inner)
