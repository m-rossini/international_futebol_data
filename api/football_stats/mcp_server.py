#!/usr/bin/env python3
"""
MCP Server for International Football Data Stats.

Thin HTTP wrapper — calls the REST API on localhost:7531 instead of loading data.
No pandas, no QueryEngine, no DataState. Just httpx.

Usage:
    python football_stats/mcp_server.py                        # streamable HTTP on :7532/mcp
    python football_stats/mcp_server.py --transport stdio      # stdio (Claude Desktop, local agents)
    python football_stats/mcp_server.py --transport sse        # deprecated legacy SSE

The streamable HTTP transport implements the MCP spec revision 2025-03-26+
(Streamable HTTP). The legacy HTTP+SSE transport from 2024-11-05 remains
available with ``--transport sse`` but is deprecated and should not be used
for new clients.
"""

import argparse
import logging
import os
import sys
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

# ---------------------------------------------------------------------------
#  Config
# ---------------------------------------------------------------------------
API_BASE = os.environ.get("API_BASE_URL", "http://localhost:7531")
REQUEST_TIMEOUT = float(os.environ.get("MCP_REQUEST_TIMEOUT", "30"))

# HTTP transport settings (streamable HTTP / legacy SSE)
MCP_HOST = os.environ.get("MCP_HOST", "0.0.0.0")
MCP_PORT = int(os.environ.get("MCP_PORT", "7532"))
MCP_HTTP_PATH = os.environ.get("MCP_HTTP_PATH", "/mcp")

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger("mcp_server")

# ---------------------------------------------------------------------------
#  HTTP client
# ---------------------------------------------------------------------------
_client: httpx.Client | None = None


def _get_client() -> httpx.Client:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.Client(base_url=API_BASE, timeout=REQUEST_TIMEOUT)
    return _client


def _get(path: str, params: dict[str, Any] | None = None) -> Any:
    """GET from the API, raise on non-200."""
    client = _get_client()
    resp = client.get(path, params=params)
    resp.raise_for_status()
    return resp.json()


# ---------------------------------------------------------------------------
#  Filter helper — converts comma-separated strings to repeated query params
# ---------------------------------------------------------------------------
def _filter_params(
    tournaments: str | None = None,
    countries: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, Any]:
    params: dict[str, Any] = {}
    if tournaments:
        params["tournaments"] = tournaments
    if countries:
        params["countries"] = countries
    if date_from:
        params["date_from"] = date_from
    if date_to:
        params["date_to"] = date_to
    return params


# ---------------------------------------------------------------------------
#  MCP server
# ---------------------------------------------------------------------------
mcp = FastMCP(
    "International Football Stats",
    host=MCP_HOST,
    port=MCP_PORT,
    # Streamable HTTP endpoint used by the current MCP spec. Exposed at
    # http://<host>:<port>/mcp by default; override with MCP_HTTP_PATH.
    streamable_http_path=MCP_HTTP_PATH,
)


# ─── Meta ─────────────────────────────────────────────────────────────────


@mcp.tool()
def get_health() -> dict:
    """Health check — returns whether the dataset is loaded and ready."""
    return _get("/health")


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
    return _get("/summary", _filter_params(tournaments, countries, date_from, date_to))


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
    return _get(
        f"/team/{team_name}",
        _filter_params(tournaments, None, date_from, date_to),
    )


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
    return _get(
        "/head_to_head",
        {
            "team1": team1,
            "team2": team2,
            **_filter_params(tournaments, countries, date_from, date_to),
        },
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

    Valid stat values: wins, losses, draws, win_rate, loss_rate, goals_pro,
    goals_against, matches, country, city.

    Optional filters: tournaments (comma-separated), date_from / date_to (YYYY-MM-DD)."""
    return _get(
        f"/most/{stat}",
        {"top_n": top_n, **_filter_params(tournaments, None, date_from, date_to)},
    )


# ─── Scorers ──────────────────────────────────────────────────────────────


@mcp.tool()
def get_top_scorers(top_n: int = 20) -> dict:
    """Top N goal scorers of all time with goal counts."""
    return _get("/top_scorers", {"top_n": top_n})


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
    return _get(
        "/biggest_wins",
        {"top_n": top_n, **_filter_params(tournaments, countries, date_from, date_to)},
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
    return _get(
        "/goals_per_year",
        {
            "sort_by": sort_by,
            "order": order,
            **_filter_params(tournaments, None, date_from, date_to),
        },
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
    return _get("/tournaments", _filter_params(None, countries, date_from, date_to))


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
    return _get(
        f"/tournament/{name}",
        _filter_params(None, countries, date_from, date_to),
    )


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
    return _get("/cities", _filter_params(tournaments, None, date_from, date_to))


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
    return _get(
        f"/city/{name}",
        _filter_params(tournaments, None, date_from, date_to),
    )


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
    return _get("/countries", _filter_params(tournaments, None, date_from, date_to))


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
    return _get(
        f"/country/{name}",
        _filter_params(tournaments, None, date_from, date_to),
    )


# ---------------------------------------------------------------------------
#  Entry point
# ---------------------------------------------------------------------------
TRANSPORTS = ["streamable-http", "stdio", "sse"]
DEFAULT_TRANSPORT = "streamable-http"


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(
        description="MCP Server for International Football Stats (API wrapper)"
    )
    parser.add_argument(
        "--transport",
        choices=TRANSPORTS,
        default=DEFAULT_TRANSPORT,
        help=(
            "Transport protocol (default: streamable-http, the current MCP "
            "spec; use stdio for local agents such as Claude Desktop; sse is "
            "deprecated)"
        ),
    )
    parser.add_argument(
        "--host",
        default=MCP_HOST,
        help=f"Bind address for HTTP transports (default: {MCP_HOST})",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=MCP_PORT,
        help=f"Port for HTTP transports (default: {MCP_PORT})",
    )
    parser.add_argument(
        "--path",
        default=MCP_HTTP_PATH,
        help=f"Endpoint path for streamable-http (default: {MCP_HTTP_PATH})",
    )
    args = parser.parse_args(argv)

    mcp.settings.host = args.host
    mcp.settings.port = args.port
    mcp.settings.streamable_http_path = args.path

    if args.transport == "stdio":
        logger.info("MCP server starting — transport=stdio, api=%s", API_BASE)
        mcp.run(transport="stdio")
        return

    if args.transport == "sse":
        logger.warning(
            "The SSE transport is deprecated by the MCP specification; "
            "use --transport streamable-http instead"
        )
        mcp.run(transport="sse")
        return

    logger.info(
        "MCP server starting — transport=streamable-http, "
        "endpoint=http://%s:%d%s, api=%s",
        args.host,
        args.port,
        args.path,
        API_BASE,
    )
    mcp.run(transport="streamable-http")


if __name__ == "__main__":
    main()
