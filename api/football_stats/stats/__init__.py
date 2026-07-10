from .loader import load_all_data
from .state import DataState
from .engine import QueryEngine
from .analysis import (
    total_matches,
    most_common_tournament,
    top_scorers,
    biggest_wins_in_df,
    team_win_rate,
    goals_per_year,
    home_advantage,
    shootout_stats,
    results_metadata,
    goalscorers_metadata,
    shootouts_metadata,
    former_names_metadata,
)

__all__ = [
    "load_all_data",
    "DataState",
    "QueryEngine",
    "total_matches",
    "most_common_tournament",
    "top_scorers",
    "biggest_wins_in_df",
    "team_win_rate",
    "goals_per_year",
    "home_advantage",
    "shootout_stats",
    "results_metadata",
    "goalscorers_metadata",
    "shootouts_metadata",
    "former_names_metadata",
]
