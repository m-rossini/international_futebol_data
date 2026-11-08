"""Former-names endpoint: current → former team name chains."""

import logging

from fastapi import APIRouter, Depends

from football_stats.routers.dependencies import FilterParamsDep, engine, require_data
from football_stats.stats.models import ErrorResponse, FormerNamesResponse

logger = logging.getLogger("stats.server.former_names")

router = APIRouter(tags=["Former Names"])


@router.get("/former-names", response_model=FormerNamesResponse | ErrorResponse)
async def former_names_endpoint(
    filters: FilterParamsDep = Depends(),
):
    """List current → former team name chains with date ranges.
    Used to trace defunct nations (e.g. USSR → Russia)."""
    require_data()
    logger.debug("GET /former-names")
    chains = engine.former_names()
    return {"total": len(chains), "chains": chains}
