"""StatsBomb Open Data event endpoints.

Event data is optional — if no StatsBomb event files are present in
``data/events/``, endpoints return empty/error responses gracefully.

Licence: StatsBomb Public Data User Agreement (non-commercial, attribution).
https://github.com/statsbomb/open-data
"""

import logging

from fastapi import APIRouter, Depends

from football_stats.routers.dependencies import FilterParamsDep, engine, require_data
from football_stats.stats.models import (
    ErrorResponse,
    StatsBombEventsResponse,
    StatsBombShotsResponse,
)

logger = logging.getLogger("stats.server.statsbomb")

router = APIRouter(tags=["StatsBomb"])


@router.get("/statsbomb/events", response_model=StatsBombEventsResponse | ErrorResponse)
async def statsbomb_events_endpoint(
    filters: FilterParamsDep = Depends(),
):
    """StatsBomb event coverage summary.

    Returns how many matches, events and shots are available from the
    StatsBomb Open Data files (if any are present).
    """
    require_data()
    logger.debug("GET /statsbomb/events")
    return engine.statsbomb_events(filters.inner)


@router.get(
    "/statsbomb/shots/{match_id}", response_model=StatsBombShotsResponse | ErrorResponse
)
async def statsbomb_shots_endpoint(
    match_id: str,
    filters: FilterParamsDep = Depends(),
):
    """Shot events for a specific match — shot map data."""
    require_data()
    logger.debug("GET /statsbomb/shots/%s", match_id)
    return engine.statsbomb_shots(match_id, filters.inner)
