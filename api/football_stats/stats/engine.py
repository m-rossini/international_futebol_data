"""Query engine — structured query logic for the REST API."""

from typing import Optional

import pandas as pd

from .log import get_logger
from .state import DataState
from .filters import FilterParams, apply_filters
from .analysis import (
    biggest_wins,
    top_scorers,
    team_win_rate,
    team_yearly,
    team_matches_all,
    team_matches_by_year,
    goals_per_year,
    results_metadata,
    goalscorers_metadata,
    shootouts_metadata,
    former_names_metadata,
    team_vs_team,
    teams_list,
    most_teams,
    most_countries,
    most_cities,
    tournaments_list,
    tournament_info,
    season_info,
    cities_list,
    city_info,
    countries_list,
    country_info,
    _strip_accents,
)
from .analysis.enrich import build_shootout_lookup, mark_shootouts

logger = get_logger("engine")


class QueryEngine:
    """Wraps a DataState and provides query methods (both NL and structured)."""

    def __init__(self, state: DataState):
        self._state = state

    # ------------------------------------------------------------------
    #  Team name resolution (case-insensitive)
    # ------------------------------------------------------------------

    def _teams_set(self) -> set[str]:
        """Return the full set of known team names from results."""
        return set(self._state.results["home_team"].unique()) | set(
            self._state.results["away_team"].unique()
        )

    def _resolve_team_name(self, name: str) -> str:
        """Find the canonical team name from a case-insensitive input.

        Raises ValueError if no match is found.
        """
        teams = self._teams_set()
        name_key = _strip_accents(name).strip().lower()
        for team in teams:
            if _strip_accents(team).lower() == name_key:
                return team
        raise ValueError(f"Unknown team: '{name}'")

    # ------------------------------------------------------------------
    #  Structured queries (used by REST endpoints)
    # ------------------------------------------------------------------

    def _filtered_results(self, filters: Optional[FilterParams]) -> pd.DataFrame:
        """Return ``self._state.results`` filtered by the given parameters."""
        return apply_filters(self._state.results, filters)

    def summary(self, filters: Optional[FilterParams] = None) -> dict:
        logger.debug("Computing summary")
        r = self._filtered_results(filters)
        return {
            "results": results_metadata(r),
            "goalscorers": goalscorers_metadata(self._state.goalscorers),
            "shootouts": shootouts_metadata(self._state.shootouts),
            "former_names": former_names_metadata(self._state.former_names),
        }

    def teams(self, filters: Optional[FilterParams] = None) -> list:
        """Return all teams with full aggregate stats."""
        logger.debug("Teams list requested")
        return teams_list(self._filtered_results(filters))

    def team(self, team_name: str, filters: Optional[FilterParams] = None) -> dict:
        logger.debug("Team stats requested: %s", team_name)
        try:
            canonical = self._resolve_team_name(team_name)
        except ValueError:
            return {
                "error": True,
                "message": f"Team '{team_name}' not found in the data.",
            }
        r = self._filtered_results(filters)
        result = team_win_rate(r, canonical)
        result["yearly"] = team_yearly(r, canonical)
        result["matches_list"] = team_matches_all(r, canonical)
        # Mark shootouts
        sl = build_shootout_lookup(self._state.shootouts)
        mark_shootouts(result["matches_list"], sl)
        mark_shootouts(result.get("biggest_wins", []), sl)
        mark_shootouts(result.get("worst_defeats", []), sl)
        return result

    def team_matches(
        self, team_name: str, year: int, filters: Optional[FilterParams] = None
    ) -> dict:
        """Return all matches for a given team in a given year."""
        logger.debug("Team matches requested: %s in %d", team_name, year)
        try:
            canonical = self._resolve_team_name(team_name)
        except ValueError:
            return {
                "error": True,
                "message": f"Team '{team_name}' not found in the data.",
            }
        r = self._filtered_results(filters)
        matches = team_matches_by_year(r, canonical, year)
        mark_shootouts(matches, build_shootout_lookup(self._state.shootouts))
        return {
            "team": canonical,
            "year": year,
            "matches": len(matches),
            "matches_list": matches,
        }

    def head_to_head(
        self, team1: str, team2: str, filters: Optional[FilterParams] = None
    ) -> dict:
        logger.debug("Head-to-head: %s vs %s", team1, team2)
        try:
            t1 = self._resolve_team_name(team1)
            t2 = self._resolve_team_name(team2)
        except ValueError as e:
            return {"error": True, "message": str(e)}
        result = team_vs_team(self._filtered_results(filters), t1, t2)
        # Mark shootouts in match list and biggest wins
        sl = build_shootout_lookup(self._state.shootouts)
        mark_shootouts(result.get("matches_list", []), sl)
        mark_shootouts(result.get(f"{t1}_biggest_wins", []), sl)
        mark_shootouts(result.get(f"{t2}_biggest_wins", []), sl)
        return result

    def most(
        self, stat: str, top_n: int = 20, filters: Optional[FilterParams] = None
    ) -> dict:
        """Top N by stat across all teams, countries, or cities."""
        logger.debug("Most requested: stat=%s top_n=%d", stat, top_n)

        r = self._filtered_results(filters)

        if stat in ("country", "countries"):
            return {"stat": stat, "top_n": top_n, "ranking": most_countries(r, top_n)}
        elif stat in ("city", "cities"):
            return {"stat": stat, "top_n": top_n, "ranking": most_cities(r, top_n)}
        else:
            try:
                ranking = most_teams(r, stat, top_n)
            except ValueError as e:
                return {"error": True, "message": str(e)}
            return {"stat": stat, "top_n": top_n, "ranking": ranking}

    def tournaments(self, filters: Optional[FilterParams] = None) -> list:
        """List all tournaments with comprehensive aggregate stats."""
        logger.debug("Tournaments list requested")
        return tournaments_list(self._filtered_results(filters))

    def tournament(self, name: str, filters: Optional[FilterParams] = None) -> dict:
        """Comprehensive stats for a specific tournament."""
        logger.debug("Tournament info requested: %s", name)
        try:
            return tournament_info(self._filtered_results(filters), name)
        except ValueError as e:
            return {"error": True, "message": str(e)}

    def season(
        self, tournament_name: str, year: int, filters: Optional[FilterParams] = None
    ) -> dict:
        """Detailed stats for a specific tournament edition (season)."""
        logger.debug("Season info requested: %s / %d", tournament_name, year)
        try:
            result = season_info(self._filtered_results(filters), tournament_name, year)
            mark_shootouts(
                result.get("matches_list", []),
                build_shootout_lookup(self._state.shootouts),
            )
            return result
        except ValueError as e:
            return {"error": True, "message": str(e)}

    # ------------------------------------------------------------------
    #  City queries
    # ------------------------------------------------------------------

    def cities(self, filters: Optional[FilterParams] = None) -> list:
        """List all cities with comprehensive stats."""
        logger.debug("Cities list requested")
        return cities_list(self._filtered_results(filters))

    def city(self, name: str, filters: Optional[FilterParams] = None) -> dict:
        """Comprehensive stats for a specific city."""
        logger.debug("City info requested: %s", name)
        try:
            return city_info(self._filtered_results(filters), name)
        except ValueError as e:
            return {"error": True, "message": str(e)}

    # ------------------------------------------------------------------
    #  Country queries
    # ------------------------------------------------------------------

    def countries(self, filters: Optional[FilterParams] = None) -> list:
        """List all countries with comprehensive stats."""
        logger.debug("Countries list requested")
        return countries_list(self._filtered_results(filters))

    def country(self, name: str, filters: Optional[FilterParams] = None) -> dict:
        """Comprehensive stats for a specific country."""
        logger.debug("Country info requested: %s", name)
        try:
            return country_info(self._filtered_results(filters), name)
        except ValueError as e:
            return {"error": True, "message": str(e)}

    def top_scorers(self, top_n: int = 20) -> dict:
        logger.debug("Top %d scorers requested", top_n)
        return top_scorers(self._state.goalscorers, top_n).to_dict()

    def biggest_wins(
        self, top_n: int = 10, filters: Optional[FilterParams] = None
    ) -> list:
        logger.debug("Top %d biggest wins requested", top_n)
        return biggest_wins(self._filtered_results(filters), top_n)

    def goals_per_year(
        self,
        sort_by: str = "goals",
        order: str = "desc",
        filters: Optional[FilterParams] = None,
    ) -> list:
        logger.debug("Goals per year requested (sort_by=%s, order=%s)", sort_by, order)
        return goals_per_year(
            self._filtered_results(filters), sort_by=sort_by, order=order
        )
