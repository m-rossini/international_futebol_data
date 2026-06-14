"""Holds the application state: loaded DataFrames and config."""

import json
import os

from .loader import load_all_data
from .log import get_logger

logger = get_logger("state")

CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "config.json")


class DataState:
    """In-memory state holding all loaded CSV data and configuration."""

    def __init__(self):
        self.results = None
        self.goalscorers = None
        self.shootouts = None
        self.former_names = None
        self.config = {}

    def reload(self) -> dict:
        """(Re)load all CSV files and the config file. Returns a summary dict."""
        logger.info("Reloading data from CSV files...")
        data = load_all_data()
        self.results = data["results"]
        self.goalscorers = data["goalscorers"]
        self.shootouts = data["shootouts"]
        self.former_names = data["former_names"]

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
        }
        logger.info("Data reloaded: %(matches_loaded)d matches, %(goalscorers_loaded)d scorers", summary)
        return summary

    @property
    def is_loaded(self) -> bool:
        return self.results is not None
