"""Tool executor — dispatches LLM tool calls to QueryEngine methods."""

from __future__ import annotations

import logging
from typing import Any

from football_stats.stats.engine import QueryEngine
from football_stats.stats.filters import FilterParams

logger = logging.getLogger("llm.executor")


class ToolExecutor:
    """Executes tool calls by dispatching to QueryEngine methods."""

    def __init__(self, engine: QueryEngine):
        self._engine = engine
        self._dispatch: dict[str, Any] = {
            "get_summary": self._get_summary,
            "get_team_stats": self._get_team_stats,
            "get_head_to_head": self._get_head_to_head,
            "get_rankings": self._get_rankings,
            "get_top_scorers": self._get_top_scorers,
            "get_biggest_wins": self._get_biggest_wins,
            "get_goals_per_year": self._get_goals_per_year,
            "get_tournament_info": self._get_tournament_info,
            "get_countries": self._get_countries,
            "get_cities": self._get_cities,
            "get_teams": self._get_teams,
            "get_year_detail": self._get_year_detail,
        }

    def execute(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute a tool by name with the given arguments.

        Returns:
            JSON-serializable dict with the tool result.

        Raises:
            KeyError: If the tool name is not known.
        """
        handler = self._dispatch.get(tool_name)
        if handler is None:
            raise KeyError(f"Unknown tool: '{tool_name}'")

        logger.info("Executing tool: %s(%s)", tool_name, arguments)
        try:
            result = handler(arguments)
        except Exception as e:
            logger.error("Tool execution failed: %s — %s", tool_name, e)
            return {"error": True, "message": str(e)}

        return result

    # ------------------------------------------------------------------
    #  Helpers
    # ------------------------------------------------------------------

    def _filters(self, args: dict[str, Any]) -> FilterParams | None:
        """Extract FilterParams from arguments, returning None if empty."""
        tournaments = args.get("tournaments")
        date_from = args.get("date_from")
        date_to = args.get("date_to")

        if tournaments:
            tournaments = [t.strip() for t in tournaments.split(",") if t.strip()]

        if not any([tournaments, date_from, date_to]):
            return None

        return FilterParams(
            tournaments=tournaments,
            date_from=date_from,
            date_to=date_to,
        )

    def _filters_with_countries(self, args: dict[str, Any]) -> FilterParams | None:
        """Extract FilterParams including countries filter."""
        tournaments = args.get("tournaments")
        countries = args.get("countries")
        date_from = args.get("date_from")
        date_to = args.get("date_to")

        if tournaments:
            tournaments = [t.strip() for t in tournaments.split(",") if t.strip()]
        if countries:
            countries = [c.strip() for c in countries.split(",") if c.strip()]

        if not any([tournaments, countries, date_from, date_to]):
            return None

        return FilterParams(
            teams=None,
            tournaments=tournaments,
            countries=countries,
            date_from=date_from,
            date_to=date_to,
        )

    # ------------------------------------------------------------------
    #  Tool handlers
    # ------------------------------------------------------------------

    def _get_summary(self, args: dict[str, Any]) -> dict:
        return self._engine.summary(self._filters(args))

    def _get_team_stats(self, args: dict[str, Any]) -> dict:
        return self._engine.team(args["team_name"], self._filters(args))

    def _get_head_to_head(self, args: dict[str, Any]) -> dict:
        return self._engine.head_to_head(
            args["team1"], args["team2"], self._filters_with_countries(args)
        )

    def _get_rankings(self, args: dict[str, Any]) -> dict:
        return self._engine.most(
            args["stat"],
            top_n=args.get("top_n", 20),
            filters=self._filters(args),
        )

    def _get_top_scorers(self, args: dict[str, Any]) -> dict:
        return self._engine.top_scorers(top_n=args.get("top_n", 20))

    def _get_biggest_wins(self, args: dict[str, Any]) -> dict:
        return {
            "biggest_wins": self._engine.biggest_wins(
                top_n=args.get("top_n", 10),
                filters=self._filters_with_countries(args),
            )
        }

    def _get_goals_per_year(self, args: dict[str, Any]) -> dict:
        return {
            "goals_per_year": self._engine.goals_per_year(
                sort_by=args.get("sort_by", "goals"),
                order=args.get("order", "desc"),
                filters=self._filters(args),
            )
        }

    def _get_tournament_info(self, args: dict[str, Any]) -> dict:
        return self._engine.tournament(args["name"], self._filters(args))

    def _get_countries(self, args: dict[str, Any]) -> dict:
        return {"countries": self._engine.countries(self._filters(args))}

    def _get_cities(self, args: dict[str, Any]) -> dict:
        return {"cities": self._engine.cities(self._filters(args))}

    def _get_teams(self, args: dict[str, Any]) -> dict:
        return {"teams": self._engine.teams(self._filters(args))}

    def _get_year_detail(self, args: dict[str, Any]) -> dict:
        return self._engine.year_detail(args["year"], self._filters(args))
