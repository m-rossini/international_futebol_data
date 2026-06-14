#!/usr/bin/env python3
"""
International Football Data Stats - Server

Thin REST interface. All query logic is delegated to stats.engine.QueryEngine.

Usage:
    python3 server.py              # Start on http://0.0.0.0:8000
    python3 server.py --port 9000  # Custom port
"""

import argparse
import sys
import time
from contextlib import asynccontextmanager
from enum import Enum

import uvicorn
from fastapi import FastAPI, HTTPException, Request, Query

from stats.state import DataState
from stats.engine import QueryEngine
from stats.log import logger


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
# Guards
# ---------------------------------------------------------------------------
def _require_data():
    if not state.is_loaded:
        raise HTTPException(503, "Data not loaded yet. Call POST /reload first.")


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
async def summary():
    """General dataset overview."""
    _require_data()
    logger.debug("GET /summary")
    return engine.summary()


@app.get("/team/{team_name}")
async def team_stats(team_name: str):
    """Stats for a specific national team."""
    _require_data()
    logger.debug("GET /team/%s", team_name)
    return engine.team(team_name)


@app.get("/head_to_head")
async def head_to_head(team1: str = Query(...), team2: str = Query(...)):
    """Head-to-head stats between two teams."""
    _require_data()
    logger.debug("GET /head_to_head?team1=%s&team2=%s", team1, team2)
    return engine.head_to_head(team1, team2)


@app.get("/top_scorers")
async def top_scorers_endpoint(top_n: int = Query(20, ge=1, le=200)):
    """Top N goal scorers of all time."""
    _require_data()
    logger.debug("GET /top_scorers?top_n=%d", top_n)
    return engine.top_scorers(top_n)


@app.get("/biggest_wins")
async def biggest_wins_endpoint(top_n: int = Query(10, ge=1, le=200)):
    """Biggest wins by goal margin."""
    _require_data()
    logger.debug("GET /biggest_wins?top_n=%d", top_n)
    return engine.biggest_wins(top_n)


@app.get("/goals_per_year")
async def goals_per_year_endpoint(
    sort_by: str = Query("goals", description="Sort field: 'year', 'goals', or 'ratio'"),
    order: str = Query("desc", description="Sort order: 'asc' or 'desc' (default)"),
):
    """Total goals and average goals per match per calendar year.

    Query params:
    - sort_by: ``year`` | ``goals`` (default) | ``ratio``
    - order: ``asc`` | ``desc`` (default)
    """
    _require_data()
    logger.debug("GET /goals_per_year?sort_by=%s&order=%s", sort_by, order)
    return engine.goals_per_year(sort_by=sort_by, order=order)


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
async def most_endpoint(stat: MostStat, top_n: int = Query(20, ge=1, le=500)):
    """Ranking of top N by a stat."""
    _require_data()
    logger.debug("GET /most/%s?top_n=%d", stat.value, top_n)
    return engine.most(stat.value, top_n)


# ---------------------------------------------------------------------------
# Tournament endpoints
# ---------------------------------------------------------------------------


@app.get("/tournaments")
async def tournaments_endpoint():
    """List all tournaments with comprehensive stats (matches, goals, years, teams)."""
    _require_data()
    logger.debug("GET /tournaments")
    return engine.tournaments()


@app.get("/tournament/{tournament_name}")
async def tournament_endpoint(tournament_name: str):
    """Comprehensive stats for a specific tournament, with yearly breakdown."""
    _require_data()
    logger.debug("GET /tournament/%s", tournament_name)
    return engine.tournament(tournament_name)


# ---------------------------------------------------------------------------
# City endpoints
# ---------------------------------------------------------------------------


@app.get("/cities")
async def cities_endpoint():
    """List all cities with comprehensive stats."""
    _require_data()
    logger.debug("GET /cities")
    return engine.cities()


@app.get("/city/{city_name}")
async def city_endpoint(city_name: str):
    """Comprehensive stats for a specific city."""
    _require_data()
    logger.debug("GET /city/%s", city_name)
    return engine.city(city_name)


# ---------------------------------------------------------------------------
# Country endpoints
# ---------------------------------------------------------------------------


@app.get("/countries")
async def countries_endpoint():
    """List all countries with comprehensive stats."""
    _require_data()
    logger.debug("GET /countries")
    return engine.countries()


@app.get("/country/{country_name}")
async def country_endpoint(country_name: str):
    """Comprehensive stats for a specific country."""
    _require_data()
    logger.debug("GET /country/%s", country_name)
    return engine.country(country_name)


@app.get("/query")
async def query(q: str = Query(..., description="Your question about football stats")):
    """Answer a natural-language question about the football data."""
    _require_data()
    logger.info("Query: %s", q)
    return engine.answer_question(q)


@app.get("/")
async def root():
    most_stats_desc = {k: v for k, v in _MOST_VALID_STATS.items()}
    return {
        "service": "International Football Stats",
        "status": "running",
        "endpoints": {
            "GET /": "This info",
            "GET /query?q=<question>": "Ask a natural-language question",
            "POST /reload": "Reload all data & config",
            "GET /summary": "Dataset overview (JSON)",
            "GET /team/{name}": "Stats for a specific team",
            "GET /head_to_head?team1=X&team2=Y": "Head-to-head",
            "GET /tournaments": "List all tournaments with stats",
            "GET /tournament/{name}": "Stats for a specific tournament",
            "GET /cities": "List all cities with stats",
            "GET /city/{name}": "Stats for a specific city",
            "GET /countries": "List all countries with stats",
            "GET /country/{name}": "Stats for a specific country",
            "GET /most/{stat}?top_n=N": "Rankings — see available_stats below",
            "GET /top_scorers?top_n=20": "Top scorers",
            "GET /biggest_wins?top_n=10": "Biggest wins",
            "GET /goals_per_year?sort_by=goals&order=desc": "Goals per year (sort: year/goals/ratio, order: asc/desc)",
        },
        "available_stats": most_stats_desc,
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
