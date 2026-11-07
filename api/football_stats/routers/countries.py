"""Country endpoints: list all countries, country detail."""

import logging
from dataclasses import replace

from fastapi import APIRouter, Depends, Query

from football_stats.routers.dependencies import FilterParamsDep, engine, require_data
from football_stats.stats.models import (
    CityListItem,
    CountryInfoResponse,
    CountryListItem,
    ErrorResponse,
)

logger = logging.getLogger("stats.server.countries")

router = APIRouter(tags=["Countries"])


@router.get("/countries", response_model=list[CountryListItem])
async def countries_endpoint(filters: FilterParamsDep = Depends()):
    """List all countries with comprehensive stats.
    Optional filters: ``?tournaments=FIFA+World+Cup``"""
    require_data()
    logger.debug("GET /countries")
    return engine.countries(filters.inner)


@router.get(
    "/country/{country_name}", response_model=CountryInfoResponse | ErrorResponse
)
async def country_endpoint(country_name: str, filters: FilterParamsDep = Depends()):
    """Comprehensive stats for a specific country.
    Optional filters: ``?tournaments=Friendly&date_from=2010``"""
    require_data()
    logger.debug("GET /country/%s", country_name)
    return engine.country(country_name, filters.inner)


@router.get(
    "/country/{country_name}/cities",
    response_model=list[CityListItem] | ErrorResponse,
)
async def country_cities_endpoint(
    country_name: str,
    filters: FilterParamsDep = Depends(),
    limit: int = Query(50, ge=1, le=200, description="Cities per page"),
    offset: int = Query(0, ge=0, description="Cities to skip"),
):
    """Cities where matches have been played in a country, with match counts.
    Optional filters: ``?tournaments=FIFA+World+Cup``"""
    require_data()
    logger.debug("GET /country/%s/cities", country_name)
    # Guard: unknown country returns an error dict from engine.country.
    check = engine.country(country_name, filters.inner)
    if isinstance(check, dict) and check.get("error"):
        return check
    scoped = replace(filters.inner, countries=[country_name])
    all_cities = engine.cities(scoped)
    page = all_cities[offset : offset + limit]
    return page
