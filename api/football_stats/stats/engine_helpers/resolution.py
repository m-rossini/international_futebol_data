"""Team-name resolution for case/accent-insensitive lookups."""

from __future__ import annotations

import pandas as pd

from ..analysis import strip_accents


def teams_set(results: pd.DataFrame) -> set[str]:
    """Return the full set of known team names from results."""
    return set(results["home_team"].unique()) | set(results["away_team"].unique())


def resolve_team_name(name: str, results: pd.DataFrame) -> str:
    """Find the canonical team name from a case-insensitive input.

    Raises ValueError if no match is found.
    """
    teams = teams_set(results)
    name_key = strip_accents(name).strip().lower()
    for team in teams:
        if strip_accents(team).lower() == name_key:
            return team
    raise ValueError(f"Unknown team: '{name}'")
