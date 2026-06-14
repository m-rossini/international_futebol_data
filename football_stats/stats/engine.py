"""Query engine — all natural-language parsing and structured query logic."""

from .log import get_logger
from .state import DataState
from .analysis import (
    total_matches,
    date_range,
    most_common_tournament,
    biggest_wins,
    top_scorers,
    team_win_rate,
    goals_per_year,
    home_advantage,
    shootout_stats,
    results_metadata,
    goalscorers_metadata,
    shootouts_metadata,
    former_names_metadata,
    team_vs_team,
    most_teams,
    most_countries,
    most_cities,
    tournaments_list,
    tournament_info,
    cities_list,
    city_info,
    countries_list,
    country_info,
    _strip_accents,
)

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
        return set(self._state.results["home_team"].unique()) | set(self._state.results["away_team"].unique())

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

    def summary(self) -> dict:
        logger.debug("Computing summary")
        return {
            "results": results_metadata(self._state.results),
            "goalscorers": goalscorers_metadata(self._state.goalscorers),
            "shootouts": shootouts_metadata(self._state.shootouts),
            "former_names": former_names_metadata(self._state.former_names),
        }

    def team(self, team_name: str) -> dict:
        logger.debug("Team stats requested: %s", team_name)
        try:
            canonical = self._resolve_team_name(team_name)
        except ValueError:
            return {"error": True, "message": f"Team '{team_name}' not found in the data."}
        return team_win_rate(self._state.results, canonical)

    def head_to_head(self, team1: str, team2: str) -> dict:
        logger.debug("Head-to-head: %s vs %s", team1, team2)
        try:
            t1 = self._resolve_team_name(team1)
            t2 = self._resolve_team_name(team2)
        except ValueError as e:
            return {"error": True, "message": str(e)}
        return team_vs_team(self._state.results, t1, t2)

    def most(self, stat: str, top_n: int = 20) -> dict:
        """Top N by stat across all teams, countries, or cities."""
        logger.debug("Most requested: stat=%s top_n=%d", stat, top_n)

        if stat in ("country", "countries"):
            return {"stat": stat, "top_n": top_n, "ranking": most_countries(self._state.results, top_n)}
        elif stat in ("city", "cities"):
            return {"stat": stat, "top_n": top_n, "ranking": most_cities(self._state.results, top_n)}
        else:
            try:
                ranking = most_teams(self._state.results, stat, top_n)
            except ValueError as e:
                return {"error": True, "message": str(e)}
            return {"stat": stat, "top_n": top_n, "ranking": ranking}

    def tournaments(self) -> list:
        """List all tournaments with comprehensive aggregate stats."""
        logger.debug("Tournaments list requested")
        return tournaments_list(self._state.results)

    def tournament(self, name: str) -> dict:
        """Comprehensive stats for a specific tournament."""
        logger.debug("Tournament info requested: %s", name)
        try:
            return tournament_info(self._state.results, name)
        except ValueError as e:
            return {"error": True, "message": str(e)}

    # ------------------------------------------------------------------
    #  City queries
    # ------------------------------------------------------------------

    def cities(self) -> list:
        """List all cities with comprehensive stats."""
        logger.debug("Cities list requested")
        return cities_list(self._state.results)

    def city(self, name: str) -> dict:
        """Comprehensive stats for a specific city."""
        logger.debug("City info requested: %s", name)
        try:
            return city_info(self._state.results, name)
        except ValueError as e:
            return {"error": True, "message": str(e)}

    # ------------------------------------------------------------------
    #  Country queries
    # ------------------------------------------------------------------

    def countries(self) -> list:
        """List all countries with comprehensive stats."""
        logger.debug("Countries list requested")
        return countries_list(self._state.results)

    def country(self, name: str) -> dict:
        """Comprehensive stats for a specific country."""
        logger.debug("Country info requested: %s", name)
        try:
            return country_info(self._state.results, name)
        except ValueError as e:
            return {"error": True, "message": str(e)}

    def top_scorers(self, top_n: int = 20) -> dict:
        logger.debug("Top %d scorers requested", top_n)
        return top_scorers(self._state.goalscorers, top_n).to_dict()

    def biggest_wins(self, top_n: int = 10) -> list:
        logger.debug("Top %d biggest wins requested", top_n)
        return biggest_wins(self._state.results, top_n)

    def goals_per_year(self, sort_by: str = "goals", order: str = "desc") -> list:
        logger.debug("Goals per year requested (sort_by=%s, order=%s)", sort_by, order)
        return goals_per_year(self._state.results, sort_by=sort_by, order=order)

    # ------------------------------------------------------------------
    #  Natural-language query
    # ------------------------------------------------------------------

    def answer_question(self, question: str) -> dict:
        """Parse a free-text question and return {question, answer, data}."""
        logger.debug("Processing question: %s", question)
        r = self._state.results
        g = self._state.goalscorers
        s = self._state.shootouts
        ql = question.lower().strip()

        # -- matches / total / count --
        if any(kw in ql for kw in ["how many", "total matches", "match count", "number of matches"]):
            n = total_matches(r)
            logger.info("Question matched: match count (%d)", n)
            return self._response(question, f"There are {n:,} international matches recorded.", {"total_matches": n})

        # -- date range --
        if any(kw in ql for kw in ["date range", "time period", "from", "oldest", "newest", "first match", "last match"]):
            start, end = date_range(r)
            logger.info("Question matched: date range (%s – %s)", start.date(), end.date())
            return self._response(question, f"Data covers {start.date()} to {end.date()}.", {"from": str(start.date()), "to": str(end.date())})

        # -- most common tournament --
        if any(kw in ql for kw in ["most common tournament", "popular tournament", "tournament most"]):
            t = most_common_tournament(r)
            logger.info("Question matched: most common tournament (%s)", t)
            return self._response(question, f"The most common tournament is '{t}'.", {"most_common_tournament": t})

        # -- top scorers --
        if "scorer" in ql or "goal" in ql or "top" in ql:
            n = self._extract_number(ql, 10)
            if "top" in ql or "scorer" in ql or "goal" in ql:
                scorers = top_scorers(g, n)
                result_list = [{"name": name, "goals": int(goals)} for name, goals in scorers.items()]
                names = ", ".join(f"{s['name']} ({s['goals']})" for s in result_list[:5])
                logger.info("Question matched: top %d scorers", n)
                return self._response(question, f"Top {n} scorers: {names}{'...' if n > 5 else ''}", result_list)

        # -- biggest wins --
        if any(kw in ql for kw in ["biggest win", "largest victory", "goal margin", "biggest score"]):
            n = self._extract_number(ql, 10)
            rows_list = biggest_wins(r, n)
            answer = f"Biggest win: {rows_list[0]['home_team']} {rows_list[0]['home_score']}-{rows_list[0]['away_score']} vs {rows_list[0]['away_team']} ({rows_list[0]['tournament']}, {rows_list[0]['date']})" if rows_list else "No match data available."
            logger.info("Question matched: biggest wins (top %d)", n)
            return self._response(question, answer, rows_list)

        # -- head-to-head (X vs Y) --
        vs_match = self._find_vs_match(question, r)
        if vs_match:
            h2h = team_vs_team(r, vs_match[0], vs_match[1])
            answer = f"{h2h['team1']} {h2h[f'{vs_match[0]}_wins']} - {h2h['draws']} - {h2h[f'{vs_match[1]}_wins']} {h2h['team2']} (goals: {h2h[f'{vs_match[0]}_goals']}-{h2h[f'{vs_match[1]}_goals']})"
            logger.info("Question matched: head-to-head (%s vs %s)", vs_match[0], vs_match[1])
            return self._response(question, answer, h2h)

        # -- single team stats --
        team = self._find_team(ql, r)
        if team:
            stats = team_win_rate(r, team)
            logger.info("Question matched: team stats (%s)", team)
            return self._response(
                question,
                f"{team}: {stats['wins']}W {stats['draws']}D {stats['losses']}L ({stats['win_rate']}% win rate, {stats['matches_played']} matches)",
                stats,
            )

        # -- home advantage --
        if any(kw in ql for kw in ["home advantage", "home win", "home team"]):
            ha = home_advantage(r)
            logger.info("Question matched: home advantage")
            return self._response(question, f"Home teams win {ha['home_win_pct']}% of matches ({ha['home_wins']}/{ha['total_matches']}).", ha)

        # -- shootout stats --
        if any(kw in ql for kw in ["shootout", "penalty"]):
            ss = shootout_stats(s)
            top_team = list(ss["most_shootout_wins"].items())[0] if len(ss["most_shootout_wins"]) > 0 else ("N/A", 0)
            logger.info("Question matched: shootout stats")
            return self._response(question, f"There are {ss['total_shootouts']} shootouts. Most wins: {top_team[0]} ({top_team[1]}).", ss)

        # -- goals per year --
        if any(kw in ql for kw in ["goals per year", "yearly goals", "goals by year"]):
            data = goals_per_year(r)
            logger.info("Question matched: goals per year")
            goals_list = [d["goals"] for d in data]
            years_list = [d["year"] for d in data]
            min_g, max_g = min(goals_list), max(goals_list)
            min_y, max_y = min(years_list), max(years_list)
            return self._response(
                question,
                f"Goals range from {min_g:,} ({min_y}) to {max_g:,} ({max_y}).",
                data,
            )

        # -- summary / overview --
        if any(kw in ql for kw in ["summary", "overview", "all stats", "general"]):
            ha = home_advantage(r)
            logger.info("Question matched: summary")
            return self._response(
                question,
                f"Total matches: {total_matches(r):,}. Top tournament: {most_common_tournament(r)}. Home win rate: {ha['home_win_pct']}%.",
                {"total_matches": total_matches(r), "most_common_tournament": most_common_tournament(r), "home_advantage": ha},
            )

        # -- fallback --
        logger.warning("Question not understood: %s", question)
        return self._response(
            question,
            "I didn't understand the question. Try: 'how many matches', 'top scorers', 'Brazil stats', 'Brazil vs Argentina', 'home advantage', 'biggest wins', 'shootout stats', 'goals per year', or 'summary'.",
            None,
        )

    # ------------------------------------------------------------------
    #  Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _response(question: str, answer: str, data):
        return {"question": question, "answer": answer, "data": data}

    @staticmethod
    def _extract_number(text: str, default: int) -> int:
        for token in text.split():
            if token.isdigit():
                return int(token)
        return default

    def _find_team(self, text: str, results) -> str | None:
        teams = self._teams_set()
        text_key = _strip_accents(text).lower()
        for team in teams:
            if _strip_accents(team).lower() in text_key:
                return team
        return None

    def _find_vs_match(self, question: str, results) -> tuple | None:
        teams = sorted(self._teams_set())
        ql = _strip_accents(question).lower()
        for sep in [" vs ", " versus ", " v "]:
            if sep in ql:
                parts = ql.split(sep)
                for t1 in teams:
                    if _strip_accents(t1).lower() in parts[0]:
                        for t2 in teams:
                            if _strip_accents(t2).lower() in parts[1] and t1 != t2:
                                return (t1, t2)
        return None
