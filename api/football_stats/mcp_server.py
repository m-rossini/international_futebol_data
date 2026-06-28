#!/usr/bin/env python3
"""
MCP Server for International Football Data Stats.

Exposes 15 tools that wrap the same QueryEngine used by the REST API,
making the dataset available to AI agents via the Model Context Protocol.

Usage:
    uv run python football_stats/mcp_server.py                  # stdio transport
    uv run python football_stats/mcp_server.py --transport sse --port 7532
"""

import argparse
import logging
import sys

from stats.state import DataState
from stats.engine import QueryEngine
from stats.filters import FilterParams

from mcp.server.fastmcp import FastMCP

# ---------------------------------------------------------------------------
#  Data loading (on import / startup)
# ---------------------------------------------------------------------------
logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger("mcp_server")

logger.info("Loading international football data...")
state = DataState()
info = state.reload()
logger.info(
    "Data loaded: %d matches, %d goalscorers, %d shootouts, %d former names",
    info["matches_loaded"],
    info["goalscorers_loaded"],
    info["shootouts_loaded"],
    info["former_names_loaded"],
)
engine = QueryEngine(state)

# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------


def _parse_filters(
    tournaments: str | None = None,
    countries: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> FilterParams:
    """Convert comma-separated string args into a FilterParams instance."""
    return FilterParams(
        tournaments=[t.strip() for t in tournaments.split(",") if t.strip()]
        if tournaments
        else None,
        countries=[c.strip() for c in countries.split(",") if c.strip()]
        if countries
        else None,
        date_from=date_from.strip() if date_from else None,
        date_to=date_to.strip() if date_to else None,
    )


# ---------------------------------------------------------------------------
#  MCP server
# ---------------------------------------------------------------------------
mcp = FastMCP("International Football Stats")


# ─── Meta ─────────────────────────────────────────────────────────────────


@mcp.tool()
def get_health() -> dict:
    """Health check — returns whether the dataset is loaded and ready."""
    return {
        "status": "ok" if state.is_loaded else "not_ready",
        "data_loaded": state.is_loaded,
    }


# ─── Summary ──────────────────────────────────────────────────────────────


@mcp.tool()
def get_summary(
    tournaments: str | None = None,
    countries: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    """Comprehensive dataset overview: total matches, total goals, tournament count, unique home/away teams,
    match outcomes (home win / away win / draw percentages), goals-per-match average,
    match distribution by year and by tournament, top scorers overview, shootouts overview.

    Optional filters: tournaments (comma-separated names), countries (comma-separated host countries),
    date_from / date_to (YYYY-MM-DD format)."""
    return engine.summary(_parse_filters(tournaments, countries, date_from, date_to))


# ─── Teams ────────────────────────────────────────────────────────────────


@mcp.tool()
def get_team_stats(
    team_name: str,
    tournaments: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    """Detailed stats for a specific national team: matches played, wins, losses, draws, win rate,
    goals-for distribution (mean, median, min, max, std dev), goals-against distribution,
    and goal-difference stats.

    Optional filters: tournaments (comma-separated), date_from / date_to (YYYY-MM-DD)."""
    return engine.team(team_name, _parse_filters(tournaments, None, date_from, date_to))


@mcp.tool()
def get_head_to_head(
    team1: str,
    team2: str,
    tournaments: str | None = None,
    countries: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    """Head-to-head comparison between two teams: total matches, wins for each side, draws,
    goals scored by each side, win rates, average goals per match for each team,
    and total-goals-per-match distribution stats.

    Optional filters: tournaments (comma-separated), countries (comma-separated host countries),
    date_from / date_to (YYYY-MM-DD)."""
    return engine.head_to_head(
        team1, team2, _parse_filters(tournaments, countries, date_from, date_to)
    )


# ─── Rankings ─────────────────────────────────────────────────────────────


@mcp.tool()
def get_rankings(
    stat: str,
    top_n: int = 20,
    tournaments: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    """Top N teams/countries/cities ranked by a statistic.

    Valid stat values:
    - wins        — most wins
    - losses      — most losses
    - draws       — most draws
    - win_rate    — highest win rate (min 10 matches)
    - loss_rate   — highest loss rate (min 10 matches)
    - goals_pro   — most goals scored
    - goals_against — most goals conceded
    - matches     — most matches played
    - country     — most matches hosted by country
    - city        — most matches hosted by city

    Optional filters: tournaments (comma-separated), date_from / date_to (YYYY-MM-DD)."""
    return engine.most(
        stat, top_n, _parse_filters(tournaments, None, date_from, date_to)
    )


# ─── Scorers ──────────────────────────────────────────────────────────────


@mcp.tool()
def get_top_scorers(top_n: int = 20) -> dict:
    """Top N goal scorers of all time with goal counts. (No tournament/country filter supported for scorers.)"""
    return engine.top_scorers(top_n)


# ─── Matches ──────────────────────────────────────────────────────────────


@mcp.tool()
def get_biggest_wins(
    top_n: int = 10,
    tournaments: str | None = None,
    countries: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list:
    """Largest-margin victories in international football: date, home team, away team, score,
    goal difference, tournament, city, country.

    Optional filters: tournaments (comma-separated), countries (comma-separated host countries),
    date_from / date_to (YYYY-MM-DD)."""
    return engine.biggest_wins(
        top_n, _parse_filters(tournaments, countries, date_from, date_to)
    )


@mcp.tool()
def get_goals_per_year(
    sort_by: str = "goals",
    order: str = "desc",
    tournaments: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list:
    """Total goals and average goals per match for each calendar year.

    sort_by: 'year', 'goals' (default), or 'ratio' (avg goals per match).
    order: 'asc' or 'desc' (default).

    Optional filters: tournaments (comma-separated), date_from / date_to (YYYY-MM-DD)."""
    return engine.goals_per_year(
        sort_by=sort_by,
        order=order,
        filters=_parse_filters(tournaments, None, date_from, date_to),
    )


# ─── Tournaments ──────────────────────────────────────────────────────────


@mcp.tool()
def list_tournaments(
    countries: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list:
    """List all tournaments with stats: first/last year, editions, matches, total goals,
    home/away wins, draws, average goals per match, unique teams, season years.

    Optional filters: countries (comma-separated host countries), date_from / date_to (YYYY-MM-DD)."""
    return engine.tournaments(_parse_filters(None, countries, date_from, date_to))


@mcp.tool()
def get_tournament(
    name: str,
    countries: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    """Detailed stats for a specific tournament: summary (editions, matches, goals, unique teams),
    yearly breakdown (matches, goals, avg goals, host country per year),
    top teams by wins, top host countries, top host cities, and biggest win.

    Optional filters: countries (comma-separated host countries), date_from / date_to (YYYY-MM-DD)."""
    return engine.tournament(name, _parse_filters(None, countries, date_from, date_to))


# ─── Cities ───────────────────────────────────────────────────────────────


@mcp.tool()
def list_cities(
    tournaments: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list:
    """List all host cities with stats: country, matches, goals, home/away wins, draws,
    unique teams, tournament count, first/last year, average goals per match.

    Optional filters: tournaments (comma-separated), date_from / date_to (YYYY-MM-DD)."""
    return engine.cities(_parse_filters(tournaments, None, date_from, date_to))


@mcp.tool()
def get_city(
    name: str,
    tournaments: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    """Detailed stats for a specific host city: match count, first/last year, total goals,
    average goals per match, home/away wins/draws, unique teams, unique tournaments,
    top teams by wins, top tournaments, and biggest win.

    Optional filters: tournaments (comma-separated), date_from / date_to (YYYY-MM-DD)."""
    return engine.city(name, _parse_filters(tournaments, None, date_from, date_to))


# ─── Countries ────────────────────────────────────────────────────────────


@mcp.tool()
def list_countries(
    tournaments: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> list:
    """List all host countries with stats: matches, total goals, home/away wins, draws,
    unique teams, tournament count, city count, first/last year, average goals per match.

    Optional filters: tournaments (comma-separated), date_from / date_to (YYYY-MM-DD)."""
    return engine.countries(_parse_filters(tournaments, None, date_from, date_to))


@mcp.tool()
def get_country(
    name: str,
    tournaments: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    """Detailed stats for a specific host country: match count, first/last year, total goals,
    average goals per match, home/away wins/draws, unique teams, unique tournaments,
    unique cities, top teams by wins, top tournaments, top cities, and biggest win.

    Optional filters: tournaments (comma-separated), date_from / date_to (YYYY-MM-DD)."""
    return engine.country(name, _parse_filters(tournaments, None, date_from, date_to))


# ---------------------------------------------------------------------------
#  Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="MCP Server for International Football Stats"
    )
    parser.add_argument(
        "--transport",
        choices=["stdio", "sse"],
        default="stdio",
        help="Transport protocol (default: stdio for Claude Desktop / local agents)",
    )
    parser.add_argument(
        "--port", type=int, default=7532, help="Port for SSE transport (default: 7532)"
    )
    args = parser.parse_args()

    logger.info("Starting MCP server — transport=%s", args.transport)
    if args.transport == "sse":
        mcp.run(transport="sse", port=args.port)
    else:
        mcp.run(transport="stdio")
