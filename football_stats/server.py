#!/usr/bin/env python3
"""
International Football Data Stats - Server

Thin REST interface. All query logic is delegated to stats.engine.QueryEngine.

Usage:
    python3 server.py              # Start on http://0.0.0.0:8000
    python3 server.py --port 9000  # Custom port
"""

import argparse
import json
import os
import sys
import time
from contextlib import asynccontextmanager
from enum import Enum
from typing import Optional

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Request, Query

from stats.state import DataState
from stats.engine import QueryEngine
from stats.filters import FilterParams
from stats.log import logger

# ---------------------------------------------------------------------------
#  Config
# ---------------------------------------------------------------------------
_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config.json")


def _load_version() -> str:
    try:
        with open(_CONFIG_PATH) as f:
            cfg = json.load(f)
        return cfg.get("version", "unknown")
    except (FileNotFoundError, json.JSONDecodeError):
        return "unknown"


class MostStat(str, Enum):
    """Stat options for the /most/{stat} endpoint."""
    wins = "wins"
    losses = "losses"
    draws = "draws"
    win_rate = "win_rate"
    loss_rate = "loss_rate"
    goals_pro = "goals_pro"
    goals_against = "goals_against"
    matches = "matches"
    country = "country"
    countries = "countries"
    city = "city"
    cities = "cities"

# ---------------------------------------------------------------------------
# Global state & engine
# ---------------------------------------------------------------------------
state = DataState()
engine = QueryEngine(state)


# ---------------------------------------------------------------------------
# Lifespan – load data on startup
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(application: FastAPI):
    logger.info("Starting server — loading data...")
    info = state.reload()
    logger.info(
        "Data loaded: %d matches, %d goalscorers, %d shootouts, %d former names",
        info["matches_loaded"],
        info["goalscorers_loaded"],
        info["shootouts_loaded"],
        info["former_names_loaded"],
    )
    yield
    logger.info("Server shutting down")


app = FastAPI(
    title="International Football Stats",
    description="Query international football match data using natural-language questions.",
    version="1.0.0",
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Middleware – log every request
# ---------------------------------------------------------------------------
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    elapsed = time.time() - start
    logger.info(
        "%s %s — %s (%.3fs)",
        request.method,
        request.url.path,
        response.status_code,
        elapsed,
    )
    return response


# ---------------------------------------------------------------------------
#  Guards
# ---------------------------------------------------------------------------
def _require_data():
    if not state.is_loaded:
        raise HTTPException(503, "Data not loaded yet. Call POST /reload first.")


# ---------------------------------------------------------------------------
#  FilterParams dependency
# ---------------------------------------------------------------------------
class _FilterParams:
    """FastAPI dependency that parses filter query params into a FilterParams."""

    def __init__(
        self,
        tournaments: Optional[list[str]] = Query(None, description="Filter by tournament name (can repeat)"),
        countries: Optional[list[str]] = Query(None, description="Filter by host country (can repeat)"),
        date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
        date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    ):
        self._inner = FilterParams(
            tournaments=tournaments,
            countries=countries,
            date_from=date_from,
            date_to=date_to,
        )

    @property
    def inner(self) -> FilterParams:
        return self._inner


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.post("/reload")
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


@app.get("/summary")
async def summary(filters: _FilterParams = Depends()):
    """General dataset overview. Optional filters: ``?tournaments=Friendly&countries=Brazil&date_from=2000-01-01``"""
    _require_data()
    logger.debug("GET /summary")
    return engine.summary(filters.inner)


@app.get("/team/{team_name}")
async def team_stats(team_name: str, filters: _FilterParams = Depends()):
    """Stats for a specific national team. Optional filters: ``?tournaments=FIFA+World+cup``"""
    _require_data()
    logger.debug("GET /team/%s", team_name)
    return engine.team(team_name, filters.inner)


@app.get("/head_to_head")
async def head_to_head(team1: str = Query(...), team2: str = Query(...), filters: _FilterParams = Depends()):
    """Head-to-head stats between two teams. Optional filters apply to matches considered."""
    _require_data()
    logger.debug("GET /head_to_head?team1=%s&team2=%s", team1, team2)
    return engine.head_to_head(team1, team2, filters.inner)


@app.get("/top_scorers")
async def top_scorers_endpoint(top_n: int = Query(20, ge=1, le=200)):
    """Top N goal scorers of all time. (No tournament/country filtering — scorers data lacks these columns.)"""
    _require_data()
    logger.debug("GET /top_scorers?top_n=%d", top_n)
    return engine.top_scorers(top_n)


@app.get("/biggest_wins")
async def biggest_wins_endpoint(top_n: int = Query(10, ge=1, le=200), filters: _FilterParams = Depends()):
    """Biggest wins by goal margin. Optional filters: ``?tournaments=FIFA+World+Cup&countries=Germany``"""
    _require_data()
    logger.debug("GET /biggest_wins?top_n=%d", top_n)
    return engine.biggest_wins(top_n, filters.inner)


@app.get("/goals_per_year")
async def goals_per_year_endpoint(
    sort_by: str = Query("goals", description="Sort field: 'year', 'goals', or 'ratio'"),
    order: str = Query("desc", description="Sort order: 'asc' or 'desc' (default)"),
    filters: _FilterParams = Depends(),
):
    """Total goals and average goals per match per calendar year.

    Query params:
    - sort_by: ``year`` | ``goals`` (default) | ``ratio``
    - order: ``asc`` | ``desc`` (default)

    Optional filters: ``?tournaments=Friendly&date_from=2000``
    """
    _require_data()
    logger.debug("GET /goals_per_year?sort_by=%s&order=%s", sort_by, order)
    return engine.goals_per_year(sort_by=sort_by, order=order, filters=filters.inner)


# ---------------------------------------------------------------------------
# /most/{stat} endpoint
# ---------------------------------------------------------------------------

_MOST_VALID_STATS = {
    "wins": "Most wins",
    "losses": "Most losses",
    "draws": "Most draws",
    "win_rate": "Highest win rate (min 10 matches)",
    "loss_rate": "Highest loss rate (min 10 matches)",
    "goals_pro": "Most goals scored (goals for)",
    "goals_against": "Most goals conceded",
    "matches": "Most matches played",
    "country": "Most matches hosted by a country",
    "countries": "Alias for 'country'",
    "city": "Most matches hosted by a city",
    "cities": "Alias for 'city'",
}


@app.get("/most/{stat}")
async def most_endpoint(stat: MostStat, top_n: int = Query(20, ge=1, le=500), filters: _FilterParams = Depends()):
    """Ranking of top N by a stat. Optional filters: ``?tournaments=FIFA+World+Cup&date_from=2000``"""
    _require_data()
    logger.debug("GET /most/%s?top_n=%d", stat.value, top_n)
    return engine.most(stat.value, top_n, filters.inner)


# ---------------------------------------------------------------------------
# Tournament endpoints
# ---------------------------------------------------------------------------


@app.get("/tournaments")
async def tournaments_endpoint(filters: _FilterParams = Depends()):
    """List all tournaments with comprehensive stats (matches, goals, years, teams). Optional filters: ``?countries=Brazil&date_from=2000``"""
    _require_data()
    logger.debug("GET /tournaments")
    return engine.tournaments(filters.inner)


@app.get("/tournament/{tournament_name}")
async def tournament_endpoint(tournament_name: str, filters: _FilterParams = Depends()):
    """Comprehensive stats for a specific tournament, with yearly breakdown. Optional filters: ``?countries=Germany&date_from=1990``"""
    _require_data()
    logger.debug("GET /tournament/%s", tournament_name)
    return engine.tournament(tournament_name, filters.inner)


# ---------------------------------------------------------------------------
# City endpoints
# ---------------------------------------------------------------------------


@app.get("/cities")
async def cities_endpoint(filters: _FilterParams = Depends()):
    """List all cities with comprehensive stats. Optional filters: ``?tournaments=FIFA+World+Cup``"""
    _require_data()
    logger.debug("GET /cities")
    return engine.cities(filters.inner)


@app.get("/city/{city_name}")
async def city_endpoint(city_name: str, filters: _FilterParams = Depends()):
    """Comprehensive stats for a specific city. Optional filters: ``?tournaments=Friendly&date_from=2000``"""
    _require_data()
    logger.debug("GET /city/%s", city_name)
    return engine.city(city_name, filters.inner)


# ---------------------------------------------------------------------------
# Country endpoints
# ---------------------------------------------------------------------------


@app.get("/countries")
async def countries_endpoint(filters: _FilterParams = Depends()):
    """List all countries with comprehensive stats. Optional filters: ``?tournaments=FIFA+World+Cup``"""
    _require_data()
    logger.debug("GET /countries")
    return engine.countries(filters.inner)


@app.get("/country/{country_name}")
async def country_endpoint(country_name: str, filters: _FilterParams = Depends()):
    """Comprehensive stats for a specific country. Optional filters: ``?tournaments=Friendly&date_from=2010``"""
    _require_data()
    logger.debug("GET /country/%s", country_name)
    return engine.country(country_name, filters.inner)


@app.get("/query")
async def query(q: str = Query(..., description="Your question about football stats")):
    """Answer a natural-language question about the football data."""
    _require_data()
    logger.info("Query: %s", q)
    return engine.answer_question(q)


@app.get("/health")
async def health():
    """Health check endpoint for container orchestration probes."""
    return {
        "status": "ok",
        "data_loaded": state.is_loaded,
    }


@app.get("/version")
async def version():
    """Return the current application version."""
    return {"version": _load_version()}


@app.get("/")
async def root():
    most_stats_desc = {k: v for k, v in _MOST_VALID_STATS.items()}
    return {
        "service": "International Football Stats",
        "status": "running",
        "version": _load_version(),
        "endpoints": {
            "GET /": "This info",
            "GET /query?q=<question>": "Ask a natural-language question",
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


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="International Football Stats Server")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default: 8000)")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="Host to bind (default: 0.0.0.0)")
    args = parser.parse_args()

    logger.info("Starting server on http://%s:%s", args.host, args.port)
    logger.info("API docs at http://%s:%s/docs", args.host, args.port)
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
