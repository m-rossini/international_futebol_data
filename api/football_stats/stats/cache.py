"""Disk cache for precomputed DataFrames.

Handles the on-disk pickle cache used to avoid recomputing the expensive
team/tournament/country/city/enriched aggregates on every (re)load. The
in-memory state still lives in ``stats/state.py``; this module owns only
the path resolution and (de)serialization logic.
"""

from __future__ import annotations

import json
import os
import pickle
from typing import Optional

import pandas as pd


_CACHE_DIR = os.path.join(
    os.path.dirname(__file__), "..", "..", ".cache", "precomputed"
)
_CACHE_META = os.path.join(_CACHE_DIR, "cache_meta.json")
_CACHE_ENRICHED = os.path.join(_CACHE_DIR, "enriched.pkl")
_CACHE_TEAMS = os.path.join(_CACHE_DIR, "teams_list.pkl")
_CACHE_TOURNAMENTS = os.path.join(_CACHE_DIR, "tournaments_list.pkl")
_CACHE_COUNTRIES = os.path.join(_CACHE_DIR, "countries_list.pkl")
_CACHE_CITIES = os.path.join(_CACHE_DIR, "cities_list.pkl")

_CSV_FILES = ["results.csv", "goalscorers.csv", "shootouts.csv", "former_names.csv"]


def get_csv_sizes(data_dir: str) -> dict[str, int]:
    """Get file sizes of all source CSVs for staleness detection."""
    sizes: dict[str, int] = {}
    for name in _CSV_FILES:
        path = os.path.join(data_dir, name)
        try:
            sizes[name] = os.path.getsize(path)
        except OSError:
            sizes[name] = 0
    return sizes


def cache_is_valid(data_dir: str) -> bool:
    """Check if the disk cache exists and matches current CSV file sizes."""
    if not os.path.exists(_CACHE_META):
        return False
    if not all(
        os.path.exists(p)
        for p in [
            _CACHE_ENRICHED,
            _CACHE_TEAMS,
            _CACHE_TOURNAMENTS,
            _CACHE_COUNTRIES,
            _CACHE_CITIES,
        ]
    ):
        return False
    try:
        with open(_CACHE_META) as f:
            cached_sizes = json.load(f)
        return cached_sizes == get_csv_sizes(data_dir)
    except (json.JSONDecodeError, OSError):
        return False


def load_from_disk() -> Optional[tuple[pd.DataFrame, list, list, list, list]]:
    """Load precomputed DataFrames from disk. Returns ``None`` on any failure."""
    try:
        with open(_CACHE_ENRICHED, "rb") as f:
            enriched = pickle.load(f)
        with open(_CACHE_TEAMS, "rb") as f:
            teams = pickle.load(f)
        with open(_CACHE_TOURNAMENTS, "rb") as f:
            tournaments = pickle.load(f)
        with open(_CACHE_COUNTRIES, "rb") as f:
            countries = pickle.load(f)
        with open(_CACHE_CITIES, "rb") as f:
            cities = pickle.load(f)
        return enriched, teams, tournaments, countries, cities
    except (OSError, pickle.UnpicklingError, KeyError):
        return None


def save_to_disk(
    enriched: pd.DataFrame,
    teams: list,
    tournaments: list,
    countries: list,
    cities: list,
    data_dir: str,
) -> None:
    """Persist precomputed DataFrames to disk. Silently skips if read-only."""
    try:
        os.makedirs(_CACHE_DIR, exist_ok=True)
        with open(_CACHE_ENRICHED, "wb") as f:
            pickle.dump(enriched, f)
        with open(_CACHE_TEAMS, "wb") as f:
            pickle.dump(teams, f)
        with open(_CACHE_TOURNAMENTS, "wb") as f:
            pickle.dump(tournaments, f)
        with open(_CACHE_COUNTRIES, "wb") as f:
            pickle.dump(countries, f)
        with open(_CACHE_CITIES, "wb") as f:
            pickle.dump(cities, f)
        with open(_CACHE_META, "w") as f:
            json.dump(get_csv_sizes(data_dir), f)
    except OSError:
        pass
