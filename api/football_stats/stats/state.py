"""Holds the application state: loaded DataFrames and config."""

import json
import os

import pandas as pd

from .loader import load_all_data
from .log import get_logger
from .elo import calculate_elo_ratings

logger = get_logger("state")

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config.json")


def _drop_future_rows(df: pd.DataFrame, label: str) -> pd.DataFrame:
    """Remove rows where a 'date' column is in the future. Returns the filtered frame."""
    if "date" not in df.columns:
        return df
    today = pd.Timestamp.today().normalize()
    before = len(df)
    df = df[df["date"] <= today]
    dropped = before - len(df)
    if dropped:
        logger.info("Dropped %d future %s rows (date > %s)", dropped, label, today.date())
    return df


class DataState:
    """In-memory state holding all loaded CSV data and configuration."""

    def __init__(self):
        self.results = None
        self.goalscorers = None
        self.shootouts = None
        self.former_names = None
        self.fifa_ranking = None
        self.elo_ratings = None
        self.config = {}

    def reload(self) -> dict:
        """(Re)load all CSV files and the config file. Returns a summary dict."""
        logger.info("Reloading data from CSV files...")
        data = load_all_data()

        # Strip future rows from any dataset with a date column
        self.results = _drop_future_rows(data["results"], "results")
        self.goalscorers = _drop_future_rows(data["goalscorers"], "goalscorers")
        self.shootouts = _drop_future_rows(data["shootouts"], "shootouts")
        self.former_names = data["former_names"]  # no date column for matches
        self.fifa_ranking = _drop_future_rows(data["fifa_ranking"], "fifa_ranking")

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

        summary = {
            "status": "ok",
            "matches_loaded": len(self.results),
            "goalscorers_loaded": len(self.goalscorers),
            "shootouts_loaded": len(self.shootouts),
            "former_names_loaded": len(self.former_names),
            "fifa_ranking_loaded": len(self.fifa_ranking),
            "elo_ratings_loaded": len(self.elo_ratings) if self.elo_ratings is not None else 0,
        }
        logger.info(
            "Data reloaded: %(matches_loaded)d matches, %(goalscorers_loaded)d scorers, "
            "%(fifa_ranking_loaded)d rankings, %(elo_ratings_loaded)d ELO rows",
            summary,
        )
        return summary

    @property
    def is_loaded(self) -> bool:
        return self.results is not None
