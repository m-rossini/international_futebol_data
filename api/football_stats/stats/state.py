"""Holds the application state: loaded DataFrames and config."""

import os

import pandas as pd

from .loader import load_all_data
from .log import get_logger
from .elo import calculate_elo_ratings
from .elo_config import load_elo_config
from .config import load_config
from .cache import cache_is_valid, load_from_disk, save_to_disk

logger = get_logger("state")

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config.json")

# Resolve data directory the same way loader does
_DATA_DIR = os.environ.get("DATA_DIR") or os.path.join(
    os.path.dirname(__file__), "..", "..", "data"
)


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
        self.elo_config = None
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

    def _persist_caches(self) -> None:
        """Save the precomputed caches to disk (best-effort)."""
        save_to_disk(
            self._cache_enriched,
            self._cache_teams_list,
            self._cache_tournaments_list,
            self._cache_countries_list,
            self._cache_cities_list,
            _DATA_DIR,
        )

    def reload(self) -> dict:
        """(Re)load all CSV files and the config file. Returns a summary dict."""
        logger.info("Reloading data from CSV files...")
        data = load_all_data()

        # Future matches have NA scores and are correctly skipped by ELO calculation.
        self.results = data["results"]

        # Drop future rows from goalscorers and shootouts (require actual scores)
        self.goalscorers = _drop_future_rows(data["goalscorers"], "goalscorers")
        self.shootouts = _drop_future_rows(data["shootouts"], "shootouts")
        self.former_names = data["former_names"]  # no date column for matches

        # Load config BEFORE ELO calculation so elo_config is available
        if os.path.exists(CONFIG_PATH):
            self.config = load_config(CONFIG_PATH)
            logger.debug("Config loaded from %s", CONFIG_PATH)
        else:
            self.config = {}
            logger.warning("Config file not found at %s", CONFIG_PATH)

        # Build ELO config from the loaded config
        elo_cfg = load_elo_config(self.config)
        self.elo_config = elo_cfg

        # Calculate ELO ratings from historical match results
        if self.results is not None and not self.results.empty:
            logger.info("Calculating ELO ratings from %d matches...", len(self.results))
            self.elo_ratings = calculate_elo_ratings(self.results, elo_config=elo_cfg)
        else:
            self.elo_ratings = None
            logger.warning("No match results available for ELO calculation.")

        # Load or compute precomputed list caches
        if self.results is not None and not self.results.empty:
            if cache_is_valid(_DATA_DIR):
                caches = load_from_disk()
                if caches is not None:
                    (
                        self._cache_enriched,
                        self._cache_teams_list,
                        self._cache_tournaments_list,
                        self._cache_countries_list,
                        self._cache_cities_list,
                    ) = caches
                    logger.info(
                        "Disk cache loaded: %d teams, %d tournaments, "
                        "%d countries, %d cities",
                        len(self._cache_teams_list),
                        len(self._cache_tournaments_list),
                        len(self._cache_countries_list),
                        len(self._cache_cities_list),
                    )
                else:
                    self._compute_caches()
                    self._persist_caches()
            else:
                self._compute_caches()
                self._persist_caches()

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
