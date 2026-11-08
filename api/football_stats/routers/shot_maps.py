"""ShotMaps Open Data event endpoints.

Event data is optional — if no ShotMaps event files are present in
``data/events/``, endpoints return empty/error responses gracefully.

Licence: ShotMaps Public Data User Agreement (non-commercial, attribution).
https://github.com/shot_maps/open-data
"""

import logging

from fastapi import APIRouter, Depends

from football_stats.routers.dependencies import FilterParamsDep, engine, require_data
from football_stats.stats.models import (
    ErrorResponse,
    ShotMapsEventsResponse,
    ShotMapsShotsResponse,
)

logger = logging.getLogger("stats.server.shot_maps")

router = APIRouter(tags=["ShotMaps"])


@router.get("/shot_maps/events", response_model=ShotMapsEventsResponse | ErrorResponse)
async def shot_maps_events_endpoint(
    filters: FilterParamsDep = Depends(),
):
    """ShotMaps event coverage summary.

    Returns how many matches, events and shots are available from the
    ShotMaps Open Data files (if any are present).
    """
    require_data()
    logger.debug("GET /shot_maps/events")
    return engine.shot_maps_events(filters.inner)


@router.get(
    "/shot_maps/shots/{match_id}", response_model=ShotMapsShotsResponse | ErrorResponse
)
async def shot_maps_shots_endpoint(
    match_id: str,
    filters: FilterParamsDep = Depends(),
):
    """Shot events for a specific match — shot map data."""
    require_data()
    logger.debug("GET /shot_maps/shots/%s", match_id)
    return engine.shot_maps_shots(match_id, filters.inner)
