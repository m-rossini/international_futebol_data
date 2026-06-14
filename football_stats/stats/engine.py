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
)

logger = get_logger("engine")


class QueryEngine:
    """Wraps a DataState and provides query methods (both NL and structured)."""

    def __init__(self, state: DataState):
        self._state = state

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
        return team_win_rate(self._state.results, team_name)

    def head_to_head(self, team1: str, team2: str) -> dict:
        logger.debug("Head-to-head: %s vs %s", team1, team2)
        return team_vs_team(self._state.results, team1, team2)

    def top_scorers(self, top_n: int = 20) -> dict:
        logger.debug("Top %d scorers requested", top_n)
        return top_scorers(self._state.goalscorers, top_n).to_dict()

    def biggest_wins(self, top_n: int = 10) -> list:
        logger.debug("Top %d biggest wins requested", top_n)
        return biggest_wins(self._state.results, top_n).to_dict(orient="records")

    def goals_per_year(self) -> list:
        logger.debug("Goals per year requested")
        return goals_per_year(self._state.results).to_dict(orient="records")

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
            rows = biggest_wins(r, n)
            rows_list = rows.to_dict(orient="records")
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
            df = goals_per_year(r)
            logger.info("Question matched: goals per year")
            return self._response(
                question,
                f"Goals range from {int(df['total_goals'].min()):,} (year {int(df['year'].min())}) to {int(df['total_goals'].max()):,} (year {int(df['year'].max())}).",
                df.to_dict(orient="records"),
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

    @staticmethod
    def _find_team(text: str, results) -> str | None:
        teams = sorted(set(results["home_team"].unique()) | set(results["away_team"].unique()))
        for team in teams:
            if team.lower() in text:
                return team
        return None

    @staticmethod
    def _find_vs_match(question: str, results) -> tuple | None:
        teams = sorted(set(results["home_team"].unique()) | set(results["away_team"].unique()))
        for sep in [" vs ", " versus ", " v "]:
            if sep in question:
                parts = question.split(sep)
                for t1 in teams:
                    if t1.lower() in parts[0].lower():
                        for t2 in teams:
                            if t2.lower() in parts[1].lower() and t1 != t2:
                                return (t1, t2)
        return None
