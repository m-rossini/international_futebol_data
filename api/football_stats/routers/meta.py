"""Meta / infrastructure endpoints: root, health, version, reload."""

import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse

from football_stats.routers.dependencies import (
    get_state,
    load_version,
    require_data,
)
from football_stats.stats.elo import clear_elo_cache
from football_stats.stats.models import (
    FilterOptionsResponse,
    HealthResponse,
    ReloadResponse,
    VersionResponse,
)
from football_stats.stats.state import DataState

logger = logging.getLogger("stats.server.meta")

router = APIRouter(tags=["Meta"])


@router.post("/reload", response_model=ReloadResponse)
async def reload_endpoint(
    state: DataState = Depends(get_state),
    force_elo_recalc: bool = Query(
        False, description="Clear ELO cache and force recalculation from matches"
    ),
):
    """Reload all CSV data and config file.

    Use ``?force_elo_recalc=true`` to delete the cached ELO ratings and
    recompute them from the match results on next calculation.
    """
    logger.info("Reload requested (force_elo_recalc=%s)", force_elo_recalc)
    if force_elo_recalc:
        cleared = clear_elo_cache()
        logger.info("ELO cache cleared: %s", cleared)
    try:
        info = state.reload()
        logger.info(
            "Reload complete — %d matches, %d scorers",
            info["matches_loaded"],
            info["goalscorers_loaded"],
        )
        return {"message": "Data reloaded successfully", **info}
    except Exception as e:
        logger.error("Reload failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=HealthResponse)
async def health(state: DataState = Depends(get_state)):
    """Health check endpoint for container orchestration probes."""
    return {
        "status": "ok",
        "data_loaded": state.is_loaded,
    }


@router.get("/version", response_model=VersionResponse)
async def version():
    """Return the current application version."""
    return {"version": load_version()}


@router.get("/filters", response_model=FilterOptionsResponse)
async def filter_options(
    state: DataState = Depends(get_state),
    _: None = Depends(require_data),
):
    """Return distinct filter values (tournaments, countries, cities) populated
    from the cached data. Useful for pre-populating UI dropdowns.
    """
    results = state.results
    return {
        "tournaments": sorted(results["tournament"].dropna().unique().tolist()),
        "countries": sorted(results["country"].dropna().unique().tolist()),
        "cities": sorted(results["city"].dropna().unique().tolist()),
        "teams": sorted(
            set(results["home_team"].dropna().unique().tolist())
            | set(results["away_team"].dropna().unique().tolist())
        ),
    }


@router.get("/", include_in_schema=False)
async def root():
    """Redirect to the interactive API docs."""
    return RedirectResponse(url="/docs")
