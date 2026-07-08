"""Statistical analysis package — split into domain-specific modules."""

from .enrich import strip_accents, enrich_match_results

from .advanced_stats import (
    series_stats,
    goals_distribution_stats,
    matches_distribution_stats,
    scorer_distribution_stats,
)

from .metadata import (
    total_matches,
    date_range,
    tournaments_available,
    most_common_tournament,
    home_advantage,
    results_metadata,
    goalscorers_metadata,
    shootouts_metadata,
    former_names_metadata,
    shootout_stats,
)

from .goals import (
    goals_per_year,
    top_scorers,
    top_scorers_by_national_team,
)

from .team import (
    team_win_rate,
    team_yearly,
    team_matches_all,
    team_matches_by_year,
    team_vs_team,
    teams_list,
    most_teams,
    _team_aggregate,
)

from .ranking import (
    most_countries,
    most_cities,
)

from .tournament import (
    tournaments_list,
    tournament_info,
    season_info,
)

from .city import (
    cities_list,
    city_info,
)

from .country import (
    countries_list,
    country_info,
)

from .years import (
    yearly_overview,
    yearly_matches,
)

from .winner import (
    biggest_wins_in_df,
    biggest_single_win,
)

__all__ = [
    "strip_accents",
    "enrich_match_results",
    "series_stats",
    "goals_distribution_stats",
    "matches_distribution_stats",
    "scorer_distribution_stats",
    "total_matches",
    "date_range",
    "tournaments_available",
    "most_common_tournament",
    "home_advantage",
    "results_metadata",
    "goalscorers_metadata",
    "shootouts_metadata",
    "former_names_metadata",
    "shootout_stats",
    "goals_per_year",
    "top_scorers",
    "top_scorers_by_national_team",
    "team_win_rate",
    "team_yearly",
    "team_matches_all",
    "team_matches_by_year",
    "team_vs_team",
    "teams_list",
    "most_teams",
    "_team_aggregate",
    "most_countries",
    "most_cities",
    "tournaments_list",
    "tournament_info",
    "season_info",
    "cities_list",
    "city_info",
    "countries_list",
    "country_info",
    "biggest_wins_in_df",
    "biggest_single_win",
    "biggest_wins",
    "_strip_accents",
    "yearly_overview",
    "yearly_matches",
]

# ---------------------------------------------------------------------------
#  Backward-compatible aliases
# ---------------------------------------------------------------------------
# engine.py imports `biggest_wins` (the old function name)
# and `_strip_accents` (with leading underscore)
biggest_wins = biggest_wins_in_df
_strip_accents = strip_accents
