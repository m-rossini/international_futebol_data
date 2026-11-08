"""Shot Maps Open Data event loading.

Reads normalized event files from ``data/events/`` (one Parquet or JSONL file
per competition). Files are optional — if the directory is absent or empty the
endpoints return empty results, so deployments without Shot Maps data are
unaffected.

Shot Maps Open Data: https://github.com/shot-maps/open-data
Licence: Shot Maps Public Data User Agreement (non-commercial, attribution).
"""

from __future__ import annotations

import logging
import os
from typing import Any

import pandas as pd

logger = logging.getLogger("stats.server.shot-maps")

_EVENTS_DIR = os.environ.get(
    "SHOT_MAPS_EVENTS_DIR",
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "events"),
)


def _load_events_file(path: str) -> pd.DataFrame:
    """Load a single events file (Parquet or JSONL)."""
    try:
        if path.endswith(".parquet"):
            return pd.read_parquet(path)
        if path.endswith(".json") or path.endswith(".jsonl"):
            return pd.read_json(path, lines=True)
    except Exception as e:  # pragma: no cover - defensive
        logger.warning("Failed to read %s: %s", path, e)
    return pd.DataFrame()


def load_events() -> pd.DataFrame:
    """Load all event files from ``data/events/`` into one frame.

    Returns an empty frame (with the expected columns) when no event data is
    present, so callers don't need to special-case absence.
    """
    columns = [
        "match_id",
        "team",
        "player_name",
        "type",
        "minute",
        "x",
        "y",
        "xg",
        "body_part",
        "outcome",
    ]
    if not os.path.isdir(_EVENTS_DIR):
        logger.debug("Shot Maps events dir not found: %s", _EVENTS_DIR)
        return pd.DataFrame(columns=columns)

    frames: list[pd.DataFrame] = []
    for fname in sorted(os.listdir(_EVENTS_DIR)):
        fpath = os.path.join(_EVENTS_DIR, fname)
        if not os.path.isfile(fpath):
            continue
        df = _load_events_file(fpath)
        if not df.empty:
            frames.append(df)

    if not frames:
        return pd.DataFrame(columns=columns)

    events = pd.concat(frames, ignore_index=True)
    for col in columns:
        if col not in events.columns:
            events[col] = None
    return events[columns]


def shots_for_match(events: pd.DataFrame, match_id: str) -> list[dict[str, Any]]:
    """Return shot events for a match, with x/y/xg for shot maps."""
    if events is None or events.empty:
        return []
    df = events[
        (events["match_id"].astype(str) == str(match_id)) & (events["type"] == "Shot")
    ]
    if df.empty:
        return []
    out = []
    for _, r in df.iterrows():
        out.append(
            {
                "player_name": r.get("player_name"),
                "team": r.get("team"),
                "minute": r.get("minute"),
                "x": r.get("x"),
                "y": r.get("y"),
                "xg": r.get("xg"),
                "body_part": r.get("body_part"),
                "outcome": r.get("outcome"),
            }
        )
    return out


def match_has_events(events: pd.DataFrame, match_id: str) -> bool:
    """True if any event exists for the match."""
    if events is None or events.empty:
        return False
    return bool((events["match_id"].astype(str) == str(match_id)).any())
