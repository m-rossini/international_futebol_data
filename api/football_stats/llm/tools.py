"""Tool definitions for LLM function calling.

These map to QueryEngine methods and mirror the MCP server tools for
consistency. Each tool is a dict in OpenAI function-calling format.
"""

from __future__ import annotations

from typing import Any


def get_tool_definitions() -> list[dict[str, Any]]:
    """Return all tool definitions in OpenAI function-calling format."""
    return [
        get_summary_tool(),
        get_team_stats_tool(),
        get_head_to_head_tool(),
        get_rankings_tool(),
        get_top_scorers_tool(),
        get_biggest_wins_tool(),
        get_goals_per_year_tool(),
        get_tournament_info_tool(),
        get_countries_tool(),
        get_cities_tool(),
        get_teams_tool(),
        get_year_detail_tool(),
    ]


def _filter_properties() -> dict[str, Any]:
    """Shared filter parameters for tools that support them."""
    return {
        "tournaments": {
            "type": "string",
            "description": "Comma-separated tournament names to filter by",
        },
        "date_from": {
            "type": "string",
            "description": "Start date in YYYY-MM-DD format",
        },
        "date_to": {
            "type": "string",
            "description": "End date in YYYY-MM-DD format",
        },
    }


def _filter_required() -> list[str]:
    return []


def _make_tool(
    name: str,
    description: str,
    parameters: dict[str, Any],
) -> dict[str, Any]:
    return {
        "type": "function",
        "function": {
            "name": name,
            "description": description,
            "parameters": parameters,
        },
    }


# ---------------------------------------------------------------------------
#  Tool definitions
# ---------------------------------------------------------------------------


def get_summary_tool() -> dict[str, Any]:
    return _make_tool(
        name="get_summary",
        description=(
            "Comprehensive dataset overview: total matches, total goals, "
            "tournament count, unique teams, match outcomes (home win / away "
            "win / draw percentages), goals-per-match average."
        ),
        parameters={
            "type": "object",
            "properties": _filter_properties(),
            "required": _filter_required(),
        },
    )


def get_team_stats_tool() -> dict[str, Any]:
    return _make_tool(
        name="get_team_stats",
        description=(
            "Detailed stats for a specific national team: matches played, "
            "wins, losses, draws, win rate, goals-for distribution, "
            "goals-against distribution, and goal-difference stats."
        ),
        parameters={
            "type": "object",
            "properties": {
                "team_name": {
                    "type": "string",
                    "description": "Name of the team (e.g. 'Brazil', 'Germany')",
                },
                **_filter_properties(),
            },
            "required": ["team_name"],
        },
    )


def get_head_to_head_tool() -> dict[str, Any]:
    return _make_tool(
        name="get_head_to_head",
        description=(
            "Head-to-head comparison between two teams: total matches, wins "
            "for each side, draws, goals scored by each side, win rates."
        ),
        parameters={
            "type": "object",
            "properties": {
                "team1": {
                    "type": "string",
                    "description": "First team name",
                },
                "team2": {
                    "type": "string",
                    "description": "Second team name",
                },
                "tournaments": {
                    "type": "string",
                    "description": "Comma-separated tournament names to filter by",
                },
                "date_from": {
                    "type": "string",
                    "description": "Start date in YYYY-MM-DD format",
                },
                "date_to": {
                    "type": "string",
                    "description": "End date in YYYY-MM-DD format",
                },
            },
            "required": ["team1", "team2"],
        },
    )


def get_rankings_tool() -> dict[str, Any]:
    return _make_tool(
        name="get_rankings",
        description=(
            "Top N teams, countries, or cities ranked by a statistic. "
            "Valid stats: wins, losses, draws, win_rate, loss_rate, "
            "goals_pro, goals_against, matches."
        ),
        parameters={
            "type": "object",
            "properties": {
                "stat": {
                    "type": "string",
                    "description": "The statistic to rank by",
                    "enum": [
                        "wins",
                        "losses",
                        "draws",
                        "win_rate",
                        "loss_rate",
                        "goals_pro",
                        "goals_against",
                        "matches",
                    ],
                },
                "top_n": {
                    "type": "integer",
                    "description": "Number of results to return (default: 20)",
                    "default": 20,
                },
                **_filter_properties(),
            },
            "required": ["stat"],
        },
    )


def get_top_scorers_tool() -> dict[str, Any]:
    return _make_tool(
        name="get_top_scorers",
        description="Top N goal scorers of all time with goal counts.",
        parameters={
            "type": "object",
            "properties": {
                "top_n": {
                    "type": "integer",
                    "description": "Number of scorers to return (default: 20)",
                    "default": 20,
                },
            },
            "required": [],
        },
    )


def get_biggest_wins_tool() -> dict[str, Any]:
    return _make_tool(
        name="get_biggest_wins",
        description=(
            "Largest-margin victories in international football: date, "
            "home team, away team, score, goal difference, tournament."
        ),
        parameters={
            "type": "object",
            "properties": {
                "top_n": {
                    "type": "integer",
                    "description": "Number of results to return (default: 10)",
                    "default": 10,
                },
                "tournaments": {
                    "type": "string",
                    "description": "Comma-separated tournament names to filter by",
                },
                "date_from": {
                    "type": "string",
                    "description": "Start date in YYYY-MM-DD format",
                },
                "date_to": {
                    "type": "string",
                    "description": "End date in YYYY-MM-DD format",
                },
            },
            "required": [],
        },
    )


def get_goals_per_year_tool() -> dict[str, Any]:
    return _make_tool(
        name="get_goals_per_year",
        description=("Total goals and average goals per match for each calendar year."),
        parameters={
            "type": "object",
            "properties": {
                "sort_by": {
                    "type": "string",
                    "description": "Sort field: 'year', 'goals', or 'ratio'",
                    "enum": ["year", "goals", "ratio"],
                    "default": "goals",
                },
                "order": {
                    "type": "string",
                    "description": "Sort order: 'asc' or 'desc'",
                    "enum": ["asc", "desc"],
                    "default": "desc",
                },
                "tournaments": {
                    "type": "string",
                    "description": "Comma-separated tournament names to filter by",
                },
                "date_from": {
                    "type": "string",
                    "description": "Start date in YYYY-MM-DD format",
                },
                "date_to": {
                    "type": "string",
                    "description": "End date in YYYY-MM-DD format",
                },
            },
            "required": [],
        },
    )


def get_tournament_info_tool() -> dict[str, Any]:
    return _make_tool(
        name="get_tournament_info",
        description=(
            "Detailed stats for a specific tournament: summary, yearly "
            "breakdown, top teams, host countries, host cities, biggest win."
        ),
        parameters={
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "Tournament name (e.g. 'FIFA World Cup')",
                },
                "date_from": {
                    "type": "string",
                    "description": "Start date in YYYY-MM-DD format",
                },
                "date_to": {
                    "type": "string",
                    "description": "End date in YYYY-MM-DD format",
                },
            },
            "required": ["name"],
        },
    )


def get_countries_tool() -> dict[str, Any]:
    return _make_tool(
        name="get_countries",
        description=(
            "List all host countries with stats: matches, total goals, "
            "home/away wins, draws, unique teams, tournament count."
        ),
        parameters={
            "type": "object",
            "properties": _filter_properties(),
            "required": _filter_required(),
        },
    )


def get_cities_tool() -> dict[str, Any]:
    return _make_tool(
        name="get_cities",
        description=(
            "List all host cities with stats: country, matches, goals, "
            "home/away wins, draws, unique teams, tournament count."
        ),
        parameters={
            "type": "object",
            "properties": _filter_properties(),
            "required": _filter_required(),
        },
    )


def get_teams_tool() -> dict[str, Any]:
    return _make_tool(
        name="get_teams",
        description=(
            "List all teams with aggregate stats: matches, wins, losses, "
            "draws, goals, win rate, and current ELO rating/ranking."
        ),
        parameters={
            "type": "object",
            "properties": _filter_properties(),
            "required": _filter_required(),
        },
    )


def get_year_detail_tool() -> dict[str, Any]:
    return _make_tool(
        name="get_year_detail",
        description=(
            "Comprehensive stats for a specific year: matches played, "
            "total goals, average goals, top teams, and match list."
        ),
        parameters={
            "type": "object",
            "properties": {
                "year": {
                    "type": "integer",
                    "description": "The year to get details for (e.g. 2022)",
                },
            },
            "required": ["year"],
        },
    )
