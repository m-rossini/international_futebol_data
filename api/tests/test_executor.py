"""Tests for llm/executor.py — ToolExecutor dispatches tool calls to QueryEngine."""

from unittest.mock import MagicMock

import pytest

from football_stats.llm.executor import ToolExecutor


class TestToolExecutor:
    """Tests for ToolExecutor dispatch and handler methods using a mock engine."""

    @pytest.fixture
    def mock_engine(self):
        """Create a mock QueryEngine."""
        engine = MagicMock()
        engine.summary.return_value = {
            "results": {"total_matches": 100},
            "goalscorers": {"unique_scorers": 50},
        }
        engine.team.return_value = {"team": "Brazil", "matches_played": 50}
        engine.head_to_head.return_value = {
            "team1": "Brazil",
            "team2": "Argentina",
            "team1_wins": 10,
        }
        engine.most.return_value = {"ranking": [{"team": "Brazil", "value": 10}]}
        engine.top_scorers.return_value = {
            "top_scorers": [{"name": "Pele", "goals": 77}]
        }
        engine.biggest_wins.return_value = [
            {"home_team": "Brazil", "away_team": "X", "home_score": 10, "away_score": 0}
        ]
        engine.goals_per_year.return_value = {
            "goals_per_year": [{"year": 2022, "goals": 100}]
        }
        engine.tournament.return_value = {"tournament": "FIFA World Cup", "matches": 50}
        engine.countries.return_value = [{"country": "Brazil", "matches": 50}]
        engine.cities.return_value = [{"city": "Rio", "matches": 10}]
        engine.teams.return_value = [{"team": "Brazil", "matches_played": 50}]
        engine.year_detail.return_value = {"year": 2022, "matches": 50}
        return engine

    @pytest.fixture
    def executor(self, mock_engine):
        """Create a ToolExecutor with the mock engine."""
        return ToolExecutor(mock_engine)

    def test_execute_unknown_tool_raises(self, executor):
        """Unknown tool name raises KeyError."""
        with pytest.raises(KeyError, match="Unknown tool"):
            executor.execute("nonexistent_tool", {})

    def test_execute_get_summary(self, executor, mock_engine):
        """get_summary tool dispatches to engine.summary."""
        result = executor.execute("get_summary", {})
        assert result == {
            "results": {"total_matches": 100},
            "goalscorers": {"unique_scorers": 50},
        }
        mock_engine.summary.assert_called_once()

    def test_execute_get_team_stats(self, executor, mock_engine):
        """get_team_stats tool returns team stats."""
        result = executor.execute("get_team_stats", {"team_name": "Brazil"})
        assert result == {"team": "Brazil", "matches_played": 50}
        mock_engine.team.assert_called_once_with("Brazil", None)

    def test_execute_get_team_stats_with_filters(self, executor, mock_engine):
        """get_team_stats passes filters to engine.team."""
        executor.execute(
            "get_team_stats", {"team_name": "Brazil", "tournaments": "FIFA World Cup"}
        )
        mock_engine.team.assert_called_once()
        args = mock_engine.team.call_args
        assert args[0][0] == "Brazil"
        assert args[0][1].tournaments == ["FIFA World Cup"]

    def test_execute_get_team_stats_unknown(self, executor, mock_engine):
        """get_team_stats with unknown team returns error dict."""
        mock_engine.team.side_effect = ValueError("Unknown team")
        result = executor.execute("get_team_stats", {"team_name": "UnknownTeam"})
        assert result.get("error") is True
        assert "Unknown team" in result["message"]

    def test_execute_get_head_to_head(self, executor, mock_engine):
        """get_head_to_head tool returns H2H stats."""
        result = executor.execute(
            "get_head_to_head",
            {"team1": "Brazil", "team2": "Argentina"},
        )
        assert result == {"team1": "Brazil", "team2": "Argentina", "team1_wins": 10}
        mock_engine.head_to_head.assert_called_once_with("Brazil", "Argentina", None)

    def test_execute_get_head_to_head_with_filters(self, executor, mock_engine):
        """get_head_to_head passes filters with countries."""
        executor.execute(
            "get_head_to_head",
            {"team1": "Brazil", "team2": "Argentina", "tournaments": "FIFA World Cup"},
        )
        mock_engine.head_to_head.assert_called_once()
        args = mock_engine.head_to_head.call_args
        assert args[0][0] == "Brazil"
        assert args[0][1] == "Argentina"
        assert args[0][2].tournaments == ["FIFA World Cup"]

    def test_execute_get_head_to_head_unknown(self, executor, mock_engine):
        """get_head_to_head with unknown team returns error."""
        mock_engine.head_to_head.side_effect = ValueError("Unknown team")
        result = executor.execute(
            "get_head_to_head",
            {"team1": "UnknownTeam", "team2": "Argentina"},
        )
        assert result.get("error") is True
        assert "Unknown team" in result["message"]

    def test_execute_get_rankings(self, executor, mock_engine):
        """get_rankings tool returns team rankings."""
        result = executor.execute("get_rankings", {"stat": "wins", "top_n": 5})
        assert result == {"ranking": [{"team": "Brazil", "value": 10}]}
        mock_engine.most.assert_called_once_with("wins", top_n=5, filters=None)

    def test_execute_get_rankings_with_filters(self, executor, mock_engine):
        """get_rankings passes filters to engine.most."""
        executor.execute(
            "get_rankings",
            {"stat": "wins", "top_n": 5, "tournaments": "FIFA World Cup"},
        )
        mock_engine.most.assert_called_once()
        args = mock_engine.most.call_args
        assert args[0][0] == "wins"
        assert args[1]["top_n"] == 5
        assert args[1]["filters"].tournaments == ["FIFA World Cup"]

    def test_execute_get_top_scorers(self, executor, mock_engine):
        """get_top_scorers tool returns top scorers."""
        result = executor.execute("get_top_scorers", {"top_n": 5})
        assert result == {"top_scorers": [{"name": "Pele", "goals": 77}]}
        mock_engine.top_scorers.assert_called_once_with(top_n=5)

    def test_execute_get_biggest_wins(self, executor, mock_engine):
        """get_biggest_wins tool returns biggest wins."""
        result = executor.execute("get_biggest_wins", {"top_n": 5})
        assert result == {
            "biggest_wins": [
                {
                    "home_team": "Brazil",
                    "away_team": "X",
                    "home_score": 10,
                    "away_score": 0,
                }
            ]
        }
        mock_engine.biggest_wins.assert_called_once_with(top_n=5, filters=None)

    def test_execute_get_goals_per_year(self, executor, mock_engine):
        """get_goals_per_year tool returns yearly goals."""
        result = executor.execute("get_goals_per_year", {})
        assert result == {
            "goals_per_year": {"goals_per_year": [{"year": 2022, "goals": 100}]}
        }
        mock_engine.goals_per_year.assert_called_once_with(
            sort_by="goals", order="desc", filters=None
        )

    def test_execute_get_tournament_info(self, executor, mock_engine):
        """get_tournament_info tool returns tournament stats."""
        result = executor.execute("get_tournament_info", {"name": "FIFA World Cup"})
        assert result == {"tournament": "FIFA World Cup", "matches": 50}
        mock_engine.tournament.assert_called_once_with("FIFA World Cup", None)

    def test_execute_get_tournament_info_unknown(self, executor, mock_engine):
        """get_tournament_info with unknown tournament returns error."""
        mock_engine.tournament.side_effect = ValueError("Unknown tournament")
        result = executor.execute(
            "get_tournament_info", {"name": "NonexistentTournament"}
        )
        assert result.get("error") is True
        assert "Unknown tournament" in result["message"]

    def test_execute_get_countries(self, executor, mock_engine):
        """get_countries tool returns country list."""
        result = executor.execute("get_countries", {})
        assert result == {"countries": [{"country": "Brazil", "matches": 50}]}
        mock_engine.countries.assert_called_once_with(None)

    def test_execute_get_cities(self, executor, mock_engine):
        """get_cities tool returns city list."""
        result = executor.execute("get_cities", {})
        assert result == {"cities": [{"city": "Rio", "matches": 10}]}
        mock_engine.cities.assert_called_once_with(None)

    def test_execute_get_teams(self, executor, mock_engine):
        """get_teams tool returns team list."""
        result = executor.execute("get_teams", {})
        assert result == {"teams": [{"team": "Brazil", "matches_played": 50}]}
        mock_engine.teams.assert_called_once_with(None)

    def test_execute_get_year_detail(self, executor, mock_engine):
        """get_year_detail tool returns year stats."""
        result = executor.execute("get_year_detail", {"year": 2022})
        assert result == {"year": 2022, "matches": 50}
        mock_engine.year_detail.assert_called_once_with(2022, None)

    def test_filters_empty(self, executor):
        """_filters returns None when no filter args."""
        assert executor._filters({}) is None
        assert (
            executor._filters({"tournaments": "", "date_from": "", "date_to": ""})
            is None
        )

    def test_filters_with_values(self, executor):
        """_filters returns FilterParams when values are present."""
        result = executor._filters(
            {
                "tournaments": "FIFA World Cup",
                "date_from": "2020-01-01",
                "date_to": "2020-12-31",
            }
        )
        assert result is not None
        assert result.tournaments == ["FIFA World Cup"]
        assert result.date_from == "2020-01-01"
        assert result.date_to == "2020-12-31"

    def test_filters_with_countries_empty(self, executor):
        """_filters_with_countries returns None when no filter args."""
        assert executor._filters_with_countries({}) is None

    def test_filters_with_countries_values(self, executor):
        """_filters_with_countries returns FilterParams with countries."""
        result = executor._filters_with_countries(
            {"tournaments": "FIFA World Cup", "countries": "Brazil, Argentina"}
        )
        assert result is not None
        assert result.tournaments == ["FIFA World Cup"]
        assert result.countries == ["Brazil", "Argentina"]
