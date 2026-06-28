"""Load all CSV data files into pandas DataFrames."""

import os
import pandas as pd
from .log import get_logger

logger = get_logger("loader")


def _data_path(filename: str) -> str:
    """Resolve the full path to a CSV file.

    The data directory is determined by the ``DATA_DIR`` environment variable.
    If unset, falls back to ``api/data/`` relative to this file (for local dev
    without container orchestration).
    """
    data_dir = os.environ.get("DATA_DIR") or os.path.join(
        os.path.dirname(__file__), "..", "..", "data"
    )
    path = os.path.join(data_dir, filename)
    resolved = os.path.realpath(path)
    logger.debug("Resolved path for %s: %s", filename, resolved)
    return resolved


# --- Dataset catalog --------------------------------------------------------
# Each entry: key (used in the dict returned by load_all_data), file, parse_dates list.
_DATASETS = [
    {"key": "results",       "file": "results.csv",       "parse_dates": ["date"]},
    {"key": "goalscorers",   "file": "goalscorers.csv",   "parse_dates": ["date"]},
    {"key": "shootouts",     "file": "shootouts.csv",     "parse_dates": ["date"]},
    {"key": "former_names",  "file": "former_names.csv",  "parse_dates": ["start_date", "end_date"]},
]


def _load_one(cfg: dict) -> pd.DataFrame:
    """Load a single CSV based on a catalog entry."""
    path = _data_path(cfg["file"])
    logger.info("Loading %s (%s)...", cfg["file"], cfg["key"])
    df = pd.read_csv(path, parse_dates=cfg["parse_dates"])
    logger.debug("Loaded %s: %d rows, %d columns", cfg["key"], len(df), len(df.columns))
    return df


def load_all_data() -> dict[str, pd.DataFrame]:
    """Load all datasets and return them as a dict keyed by dataset name."""
    logger.info("Loading all datasets...")
    result = {cfg["key"]: _load_one(cfg) for cfg in _DATASETS}
    logger.info("All datasets loaded")
    return result
