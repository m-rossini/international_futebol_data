"""Simple ranking functions (value_counts based).

Also defines the single source of truth for the ``/most/{stat}`` endpoint:
the valid stat names, the team aggregate column each maps to, the
country/city dimension aliases, and human-readable labels.
"""

import pandas as pd

# stat name -> column in the team aggregate used by ``most_teams``
TEAM_STAT_COLUMNS: dict[str, str] = {
    "wins": "wins",
    "losses": "losses",
    "draws": "draws",
    "win_rate": "win_rate",
    "loss_rate": "loss_rate",
    "goals_pro": "goals_for",
    "goals_against": "goals_against",
    "matches": "matches_played",
}

# stats resolved against a non-team dimension (singular -> plural alias)
DIMENSION_ALIASES: dict[str, str] = {
    "country": "countries",
    "city": "cities",
}

STAT_LABELS: dict[str, str] = {
    "wins": "Most wins",
    "losses": "Most losses",
    "draws": "Most draws",
    "win_rate": "Highest win rate (min 10 matches)",
    "loss_rate": "Highest loss rate (min 10 matches)",
    "goals_pro": "Most goals scored (goals for)",
    "goals_against": "Most goals conceded",
    "matches": "Most matches played",
    "country": "Most matches hosted by a country",
    "countries": "Alias for 'country'",
    "city": "Most matches hosted by a city",
    "cities": "Alias for 'city'",
}

VALID_STATS: frozenset[str] = frozenset(
    list(TEAM_STAT_COLUMNS) + list(DIMENSION_ALIASES) + list(DIMENSION_ALIASES.values())
)


def most_countries(results: pd.DataFrame, top_n: int = 20) -> list:
    """Top N countries by number of matches hosted."""
    if results.empty:
        return []
    counts = results["country"].value_counts().head(top_n)
    return [{"country": country, "matches": int(c)} for country, c in counts.items()]


def most_cities(results: pd.DataFrame, top_n: int = 20) -> list:
    """Top N cities by number of matches hosted."""
    if results.empty:
        return []
    counts = results["city"].value_counts().head(top_n)
    return [{"city": city, "matches": int(c)} for city, c in counts.items()]
