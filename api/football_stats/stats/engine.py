"""Query engine — structured query logic for the REST API."""

from typing import Optional

import pandas as pd

from .log import get_logger
from .state import DataState
from .filters import FilterParams, apply_filters
from .engine_helpers import (
    enrich_shootouts,
    match_goalscorers,
    merge_elo,
    resolve_team_name,
)
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
    yearly_overview,
    yearly_matches,
)

logger = get_logger("engine")


class QueryEngine:
    """Wraps a DataState and provides query methods (both NL and structured)."""

    def __init__(self, state: DataState):
        self._state = state

    # ------------------------------------------------------------------
    #  Structured queries (used by REST endpoints)
    # ------------------------------------------------------------------

    def _filtered_results(self, filters: Optional[FilterParams]) -> pd.DataFrame:
        """Return ``self._state.results`` filtered by the given parameters."""
        return apply_filters(self._state.results, filters)

    def _enriched_filtered(self, filters: Optional[FilterParams]) -> pd.DataFrame:
        """Return the cached enriched DataFrame, optionally filtered."""
        if filters is None or filters.is_empty:
            return self._state.enriched
        return apply_filters(self._state.enriched, filters)

    def _no_filters(self, filters: Optional[FilterParams]) -> bool:
        """Return True if no filtering is applied (cache-safe)."""
        return filters is None or filters.is_empty

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
        """Return all teams with full aggregate stats + ELO rating/ranking."""
        if self._no_filters(filters):
            logger.debug("Teams list", extra={"source": "cache"})
            result = self._state.cache_teams_list
        else:
            logger.debug("Teams list", extra={"source": "live"})
            result = teams_list(self._filtered_results(filters))
        return merge_elo(
            result,
            self._state.results,
            filters,
            self._state.elo_ratings,
            self._state.elo_config,
        )

    def team(self, team_name: str, filters: Optional[FilterParams] = None) -> dict:
        logger.debug("Team stats requested: %s", team_name)
        try:
            canonical = resolve_team_name(team_name, self._state.results)
        except ValueError:
            return {
                "error": True,
                "message": f"Team '{team_name}' not found in the data.",
            }
        r = self._enriched_filtered(filters)
        result = team_win_rate(r, canonical)
        result["yearly"] = team_yearly(r, canonical)
        result["matches_list"] = team_matches_all(r, canonical)
        return enrich_shootouts(
            result,
            self._state.shootouts,
            "matches_list",
            "biggest_wins",
            "worst_defeats",
        )

    def team_matches(
        self, team_name: str, year: int, filters: Optional[FilterParams] = None
    ) -> dict:
        """Return all matches for a given team in a given year."""
        logger.debug("Team matches requested: %s in %d", team_name, year)
        try:
            canonical = resolve_team_name(team_name, self._state.results)
        except ValueError:
            return {
                "error": True,
                "message": f"Team '{team_name}' not found in the data.",
            }
        r = self._enriched_filtered(filters)
        matches = team_matches_by_year(r, canonical, year)
        enrich_shootouts(
            {"matches_list": matches}, self._state.shootouts, "matches_list"
        )
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
            t1 = resolve_team_name(team1, self._state.results)
            t2 = resolve_team_name(team2, self._state.results)
        except ValueError as e:
            return {"error": True, "message": str(e)}
        result = team_vs_team(self._enriched_filtered(filters), t1, t2)
        return enrich_shootouts(
            result,
            self._state.shootouts,
            "matches_list",
            f"{t1}_biggest_wins",
            f"{t2}_biggest_wins",
        )

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
        if self._no_filters(filters):
            logger.debug("Tournaments list", extra={"source": "cache"})
            return self._state.cache_tournaments_list
        logger.debug("Tournaments list", extra={"source": "live"})
        return tournaments_list(self._filtered_results(filters))

    def tournament(self, name: str, filters: Optional[FilterParams] = None) -> dict:
        """Comprehensive stats for a specific tournament."""
        logger.debug("Tournament info requested: %s", name)
        try:
            return tournament_info(self._enriched_filtered(filters), name)
        except ValueError as e:
            return {"error": True, "message": str(e)}

    def season(
        self, tournament_name: str, year: int, filters: Optional[FilterParams] = None
    ) -> dict:
        """Detailed stats for a specific tournament edition (season)."""
        logger.debug("Season info requested: %s / %d", tournament_name, year)
        try:
            result = season_info(
                self._enriched_filtered(filters), tournament_name, year
            )
            return enrich_shootouts(result, self._state.shootouts, "matches_list")
        except ValueError as e:
            return {"error": True, "message": str(e)}

    # ------------------------------------------------------------------
    #  City queries
    # ------------------------------------------------------------------

    def cities(self, filters: Optional[FilterParams] = None) -> list:
        """List all cities with comprehensive stats."""
        if self._no_filters(filters):
            logger.debug("Cities list", extra={"source": "cache"})
            return self._state.cache_cities_list
        logger.debug("Cities list", extra={"source": "live"})
        return cities_list(self._filtered_results(filters))

    def city(self, name: str, filters: Optional[FilterParams] = None) -> dict:
        """Comprehensive stats for a specific city."""
        logger.debug("City info requested: %s", name)
        try:
            return city_info(self._enriched_filtered(filters), name)
        except ValueError as e:
            return {"error": True, "message": str(e)}

    # ------------------------------------------------------------------
    #  Country queries
    # ------------------------------------------------------------------

    def countries(self, filters: Optional[FilterParams] = None) -> list:
        """List all countries with comprehensive stats."""
        if self._no_filters(filters):
            logger.debug("Countries list", extra={"source": "cache"})
            return self._state.cache_countries_list
        logger.debug("Countries list", extra={"source": "live"})
        return countries_list(self._filtered_results(filters))

    def country(self, name: str, filters: Optional[FilterParams] = None) -> dict:
        """Comprehensive stats for a specific country."""
        logger.debug("Country info requested: %s", name)
        try:
            return country_info(self._enriched_filtered(filters), name)
        except ValueError as e:
            return {"error": True, "message": str(e)}

    # ------------------------------------------------------------------
    #  Year queries
    # ------------------------------------------------------------------

    def years(self, filters: Optional[FilterParams] = None) -> list:
        """List all years with aggregate stats."""
        logger.debug("Years overview requested")
        return yearly_overview(self._filtered_results(filters))

    def year_detail(self, year: int, filters: Optional[FilterParams] = None) -> dict:
        """Comprehensive stats for a specific year."""
        logger.debug("Year detail requested: %d", year)
        overview = yearly_overview(self._filtered_results(filters))
        match = next((r for r in overview if r["year"] == year), None)
        if match is None:
            return {"error": True, "message": f"Year {year} not found in the data."}
        match["matches_list"] = yearly_matches(year, self._filtered_results(filters))
        return match

    def top_scorers(self, top_n: int = 20) -> dict:
        logger.debug("Top %d scorers requested", top_n)
        return top_scorers(self._state.goalscorers, top_n).to_dict()

    def biggest_wins(
        self, top_n: int = 10, filters: Optional[FilterParams] = None
    ) -> list:
        logger.debug("Top %d biggest wins requested", top_n)
        return biggest_wins(self._enriched_filtered(filters), top_n)

    def goals_per_year(
        self,
        sort_by: str = "goals",
        order: str = "desc",
        filters: Optional[FilterParams] = None,
    ) -> list:
        logger.debug("Goals per year requested (sort_by=%s, order=%s)", sort_by, order)
        return goals_per_year(
            self._enriched_filtered(filters), sort_by=sort_by, order=order
        )

    def match_goalscorers(self, date: str, home_team: str, away_team: str) -> dict:
        """Return goalscorers and shootout info for a specific match."""
        logger.debug("Match goalscorers: %s %s vs %s", date, home_team, away_team)
        return match_goalscorers(
            date,
            home_team,
            away_team,
            self._state.goalscorers,
            self._state.shootouts,
            self._state.results,
        )
