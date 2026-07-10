"""Shootout enrichment for engine result dicts."""

from __future__ import annotations

import pandas as pd

from ..analysis.enrich import build_shootout_lookup, mark_shootouts


def enrich_shootouts(result: dict, shootouts: pd.DataFrame, *keys: str) -> dict:
    """Mark ``shootout=True`` on the match lists stored under ``keys``.

    Builds the shootout lookup once and marks every listed key that is
    present and non-empty on ``result`` (e.g. ``matches_list``,
    ``biggest_wins``, ``worst_defeats``, ``{team}_biggest_wins``).
    """
    if shootouts is None or shootouts.empty:
        return result
    lookup = build_shootout_lookup(shootouts)
    for key in keys:
        items = result.get(key)
        if items:
            mark_shootouts(items, lookup)
    return result
