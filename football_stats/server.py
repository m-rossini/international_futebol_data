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

import uvicorn
from fastapi import FastAPI, HTTPException, Request, Query

from stats.state import DataState
from stats.engine import QueryEngine
from stats.log import logger

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
async def goals_per_year_endpoint():
    """Total goals scored per calendar year."""
    _require_data()
    logger.debug("GET /goals_per_year")
    return engine.goals_per_year()


@app.get("/query")
async def query(q: str = Query(..., description="Your question about football stats")):
    """Answer a natural-language question about the football data."""
    _require_data()
    logger.info("Query: %s", q)
    return engine.answer_question(q)


@app.get("/")
async def root():
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
            "GET /top_scorers?top_n=20": "Top scorers",
            "GET /biggest_wins?top_n=10": "Biggest wins",
            "GET /goals_per_year": "Goals per year",
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
