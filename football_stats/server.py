#!/usr/bin/env python3
"""
International Football Data Stats - Server

Thin REST interface. All query logic is delegated to stats.engine.QueryEngine.
Routers are split by domain into ``routers/``:
    meta, teams, matches, rankings, tournaments, cities, countries.

Usage:
    python3 server.py              # Start on http://0.0.0.0:8000
    python3 server.py --port 9000  # Custom port
"""

import argparse
import time
from contextlib import asynccontextmanager

import uvicorn
from fastapi import FastAPI, Request

from stats.log import logger

from routers.dependencies import state
from routers.meta import router as meta_router
from routers.teams import router as teams_router
from routers.matches import router as matches_router
from routers.rankings import router as rankings_router
from routers.tournaments import router as tournaments_router
from routers.cities import router as cities_router
from routers.countries import router as countries_router


# ---------------------------------------------------------------------------
#  Lifespan — load data on startup
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


# ---------------------------------------------------------------------------
#  App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="International Football Stats",
    description="REST API for querying international football match statistics.",
    version="1.0.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
#  Middleware — log every request
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
#  Router registration
# ---------------------------------------------------------------------------
app.include_router(meta_router)        # /, /health, /version, /reload
app.include_router(teams_router)       # /team/{name}, /head_to_head, /top_scorers
app.include_router(matches_router)     # /summary, /biggest_wins, /goals_per_year
app.include_router(rankings_router)    # /most/{stat}
app.include_router(tournaments_router) # /tournaments, /tournament/{name}
app.include_router(cities_router)      # /cities, /city/{name}
app.include_router(countries_router)   # /countries, /country/{name}


# ---------------------------------------------------------------------------
#  Entry point
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
