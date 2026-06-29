"""Holds the application state: loaded DataFrames and config."""

import json
import os
import pickle

import pandas as pd

from .loader import load_all_data
from .log import get_logger
from .elo import calculate_elo_ratings

logger = get_logger("state")

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config.json")

# Resolve data directory the same way loader does
_DATA_DIR = os.environ.get("DATA_DIR") or os.path.join(
    os.path.dirname(__file__), "..", "..", "data"
)

# Precomputed cache paths
_CACHE_DIR = os.path.join(_DATA_DIR, "precomputed")
_CACHE_META = os.path.join(_CACHE_DIR, "cache_meta.json")
_CACHE_ENRICHED = os.path.join(_CACHE_DIR, "enriched.pkl")
_CACHE_TEAMS = os.path.join(_CACHE_DIR, "teams_list.pkl")
_CACHE_TOURNAMENTS = os.path.join(_CACHE_DIR, "tournaments_list.pkl")
_CACHE_COUNTRIES = os.path.join(_CACHE_DIR, "countries_list.pkl")
_CACHE_CITIES = os.path.join(_CACHE_DIR, "cities_list.pkl")


def _drop_future_rows(df: pd.DataFrame, label: str) -> pd.DataFrame:
    """Remove rows where a 'date' column is in the future. Returns the filtered frame."""
    if "date" not in df.columns:
        return df
    today = pd.Timestamp.today().normalize()
    before = len(df)
    df = df[df["date"] <= today]
    dropped = before - len(df)
    if dropped:
        logger.info(
            "Dropped %d future %s rows (date > %s)", dropped, label, today.date()
        )
    return df


class DataState:
    """In-memory state holding all loaded CSV data and configuration."""

    def __init__(self):
        self.results = None
        self.goalscorers = None
        self.shootouts = None
        self.former_names = None
        self.elo_ratings = None
        self.config = {}

        # Precomputed list caches
        self._cache_enriched: pd.DataFrame | None = None
        self._cache_teams_list: list[dict] | None = None
        self._cache_tournaments_list: list[dict] | None = None
        self._cache_countries_list: list[dict] | None = None
        self._cache_cities_list: list[dict] | None = None

    @property
    def enriched(self) -> pd.DataFrame:
        """Return the cached enriched results DataFrame."""
        if self._cache_enriched is None:
            raise RuntimeError("Precomputed caches not loaded. Call reload() first.")
        return self._cache_enriched

    @property
    def cache_teams_list(self) -> list[dict]:
        """Return the cached teams list."""
        if self._cache_teams_list is None:
            raise RuntimeError("Precomputed caches not loaded. Call reload() first.")
        return self._cache_teams_list

    @property
    def cache_tournaments_list(self) -> list[dict]:
        """Return the cached tournaments list."""
        if self._cache_tournaments_list is None:
            raise RuntimeError("Precomputed caches not loaded. Call reload() first.")
        return self._cache_tournaments_list

    @property
    def cache_countries_list(self) -> list[dict]:
        """Return the cached countries list."""
        if self._cache_countries_list is None:
            raise RuntimeError("Precomputed caches not loaded. Call reload() first.")
        return self._cache_countries_list

    @property
    def cache_cities_list(self) -> list[dict]:
        """Return the cached cities list."""
        if self._cache_cities_list is None:
            raise RuntimeError("Precomputed caches not loaded. Call reload() first.")
        return self._cache_cities_list

    def _get_csv_sizes(self) -> dict[str, int]:
        """Get file sizes of all source CSVs for staleness detection."""
        sizes: dict[str, int] = {}
        for name in [
            "results.csv",
            "goalscorers.csv",
            "shootouts.csv",
            "former_names.csv",
        ]:
            path = os.path.join(_DATA_DIR, name)
            try:
                sizes[name] = os.path.getsize(path)
            except OSError:
                sizes[name] = 0
        return sizes

    def _cache_is_valid(self) -> bool:
        """Check if disk cache exists and matches current CSV file sizes."""
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
            return cached_sizes == self._get_csv_sizes()
        except (json.JSONDecodeError, OSError):
            return False

    def _load_from_disk_cache(self) -> None:
        """Load precomputed DataFrames from disk cache."""
        logger.info("Loading precomputed caches from disk …")
        with open(_CACHE_ENRICHED, "rb") as f:
            self._cache_enriched = pickle.load(f)
        with open(_CACHE_TEAMS, "rb") as f:
            self._cache_teams_list = pickle.load(f)
        with open(_CACHE_TOURNAMENTS, "rb") as f:
            self._cache_tournaments_list = pickle.load(f)
        with open(_CACHE_COUNTRIES, "rb") as f:
            self._cache_countries_list = pickle.load(f)
        with open(_CACHE_CITIES, "rb") as f:
            self._cache_cities_list = pickle.load(f)
        logger.info(
            "Disk cache loaded: %d teams, %d tournaments, %d countries, %d cities",
            len(self._cache_teams_list),
            len(self._cache_tournaments_list),
            len(self._cache_countries_list),
            len(self._cache_cities_list),
        )

    def _save_to_disk_cache(self) -> None:
        """Save precomputed DataFrames to disk cache."""
        os.makedirs(_CACHE_DIR, exist_ok=True)

        with open(_CACHE_ENRICHED, "wb") as f:
            pickle.dump(self._cache_enriched, f)
        with open(_CACHE_TEAMS, "wb") as f:
            pickle.dump(self._cache_teams_list, f)
        with open(_CACHE_TOURNAMENTS, "wb") as f:
            pickle.dump(self._cache_tournaments_list, f)
        with open(_CACHE_COUNTRIES, "wb") as f:
            pickle.dump(self._cache_countries_list, f)
        with open(_CACHE_CITIES, "wb") as f:
            pickle.dump(self._cache_cities_list, f)
        with open(_CACHE_META, "w") as f:
            json.dump(self._get_csv_sizes(), f)

        logger.info("Precomputed caches saved to disk.")

    def _compute_caches(self) -> None:
        """Compute all precomputed list DataFrames from raw results."""
        from .analysis.city import cities_list
        from .analysis.country import countries_list
        from .analysis.enrich import enrich_match_results
        from .analysis.team import teams_list
        from .analysis.tournament import tournaments_list

        logger.info("Computing precomputed caches …")
        self._cache_enriched = enrich_match_results(self.results)
        self._cache_teams_list = teams_list(self._cache_enriched)
        self._cache_tournaments_list = tournaments_list(self._cache_enriched)
        self._cache_countries_list = countries_list(self._cache_enriched)
        self._cache_cities_list = cities_list(self._cache_enriched)
        logger.info(
            "Caches computed: %d teams, %d tournaments, %d countries, %d cities",
            len(self._cache_teams_list),
            len(self._cache_tournaments_list),
            len(self._cache_countries_list),
            len(self._cache_cities_list),
        )

    def reload(self) -> dict:
        """(Re)load all CSV files and the config file. Returns a summary dict."""
        logger.info("Reloading data from CSV files...")
        data = load_all_data()

        # Keep all results (including future matches) so upcoming predictions work.
        # Future matches have NA scores and are correctly skipped by ELO calculation.
        self.results = data["results"]

        # Drop future rows from goalscorers and shootouts (require actual scores)
        self.goalscorers = _drop_future_rows(data["goalscorers"], "goalscorers")
        self.shootouts = _drop_future_rows(data["shootouts"], "shootouts")
        self.former_names = data["former_names"]  # no date column for matches

        # Calculate ELO ratings from historical match results
        if self.results is not None and not self.results.empty:
            logger.info("Calculating ELO ratings from %d matches...", len(self.results))
            self.elo_ratings = calculate_elo_ratings(self.results)
        else:
            self.elo_ratings = None
            logger.warning("No match results available for ELO calculation.")

        if os.path.exists(CONFIG_PATH):
            with open(CONFIG_PATH) as f:
                self.config = json.load(f)
            logger.debug("Config loaded from %s", CONFIG_PATH)
        else:
            self.config = {}
            logger.warning("Config file not found at %s", CONFIG_PATH)

        # Load or compute precomputed list caches
        if self.results is not None and not self.results.empty:
            if self._cache_is_valid():
                self._load_from_disk_cache()
            else:
                self._compute_caches()
                self._save_to_disk_cache()

        summary = {
            "status": "ok",
            "matches_loaded": len(self.results),
            "goalscorers_loaded": len(self.goalscorers),
            "shootouts_loaded": len(self.shootouts),
            "former_names_loaded": len(self.former_names),
            "elo_ratings_loaded": len(self.elo_ratings)
            if self.elo_ratings is not None
            else 0,
        }
        logger.info(
            "Data reloaded: %(matches_loaded)d matches, %(goalscorers_loaded)d scorers, "
            "%(elo_ratings_loaded)d ELO rows",
            summary,
        )
        return summary

    @property
    def is_loaded(self) -> bool:
        return self.results is not None
