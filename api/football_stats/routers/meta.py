"""Meta / infrastructure endpoints: root, health, version, reload."""

import logging

from fastapi import APIRouter, HTTPException

from .dependencies import _MOST_VALID_STATS, load_version, require_data, state
from stats.models import HealthResponse, ReloadResponse, RootResponse, VersionResponse

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


@router.get("/", response_model=RootResponse)
async def root():
    """API root — list all available endpoints and their query parameters."""
    most_stats_desc = dict(_MOST_VALID_STATS)
    return {
        "service": "International Football Stats",
        "status": "running",
        "version": load_version(),
        "endpoints": {
            "GET /": "This info",
            "POST /reload": "Reload all data & config",
            "GET /summary?tournaments=&countries=&date_from=&date_to=": "Dataset overview with optional filters",
            "GET /team/{name}?tournaments=&date_from=&date_to=": "Team stats with optional filters",
            "GET /head_to_head?team1=X&team2=Y&tournaments=&countries=": "Head-to-head with optional filters",
            "GET /tournaments?countries=&date_from=&date_to=": "List all tournaments with optional filters",
            "GET /tournament/{name}?countries=&date_from=&date_to=": "Tournament stats with optional filters",
            "GET /cities?tournaments=&date_from=&date_to=": "List all cities with optional filters",
            "GET /city/{name}?tournaments=&date_from=&date_to=": "City stats with optional filters",
            "GET /countries?tournaments=&date_from=&date_to=": "List all countries with optional filters",
            "GET /country/{name}?tournaments=&date_from=&date_to=": "Country stats with optional filters",
            "GET /most/{stat}?top_n=N&tournaments=&date_from=&date_to=": "Rankings with optional filters",
            "GET /top_scorers?top_n=20": "Top scorers (no filter support)",
            "GET /biggest_wins?top_n=10&tournaments=&countries=": "Biggest wins with optional filters",
            "GET /goals_per_year?sort_by=goals&order=desc&tournaments=&date_from=&date_to=": "Goals per year with optional filters",
            "GET /health": "Health check for container orchestration",
            "GET /version": "Current application version",
        },
        "available_stats": most_stats_desc,
        "filter_params": {
            "tournaments": "List of tournament names to filter by (repeatable query param)",
            "countries": "List of host country names to filter by (repeatable query param)",
            "date_from": "Start date in YYYY-MM-DD format (inclusive)",
            "date_to": "End date in YYYY-MM-DD format (inclusive)",
        },
        "data_loaded": state.is_loaded,
    }
