"""Meta / infrastructure endpoints: root, health, version, reload."""

import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from .dependencies import load_version, require_data, state
from stats.models import FilterOptionsResponse, HealthResponse, ReloadResponse, VersionResponse

logger = logging.getLogger("stats.server.meta")

router = APIRouter(tags=["Meta"])


@router.post("/reload", response_model=ReloadResponse)
async def reload_endpoint():
    """Reload all CSV data and config file."""
    logger.info("Reload requested")
    try:
        info = state.reload()
        logger.info("Reload complete — %d matches, %d scorers", info["matches_loaded"], info["goalscorers_loaded"])
        return {"message": "Data reloaded successfully", **info}
    except Exception as e:
        logger.error("Reload failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health", response_model=HealthResponse)
async def health():
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
async def filter_options():
    """Return distinct filter values (tournaments, countries, cities) populated
    from the cached data. Useful for pre-populating UI dropdowns.
    """
    require_data()
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
