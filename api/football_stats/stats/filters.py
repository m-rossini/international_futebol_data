"""Filtering support for analysis endpoints.

Provides a ``FilterParams`` class that can be used either as a plain
dataclass or as a FastAPI dependency via ``Depends()``.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional

import pandas as pd


@dataclass
class FilterParams:
    """Filter parameters for analysis queries.

    All fields are optional. ``None`` (or absent) means no filter on that
    dimension. ``tournaments`` and ``countries`` are lists that use an
    **OR**-within, **AND**-across semantics::

        matches AND (tournament IN tournaments)
                AND (country IN countries)
                AND (date >= date_from)
                AND (date <= date_to)
    """

    teams: Optional[list[str]] = field(default=None)
    tournaments: Optional[list[str]] = field(default=None)
    countries: Optional[list[str]] = field(default=None)
    date_from: Optional[str] = field(default=None)
    date_to: Optional[str] = field(default=None)

    @property
    def is_empty(self) -> bool:
        """Return True if all filter fields are None (no filtering applied)."""
        return (
            self.teams is None
            and self.tournaments is None
            and self.countries is None
            and self.date_from is None
            and self.date_to is None
        )


def _normalize_list(value: Optional["list[str] | str"]) -> Optional[list[str]]:
    """Normalize a filter value that may arrive as a comma-separated string,
    a list of strings, or ``None`` into a flat list of trimmed tokens.

    ``"A,B"`` -> ``["A", "B"]``; ``["A", "B,C"]`` -> ``["A", "B", "C"]``;
    ``None``/``""`` -> ``None``.
    """
    if value is None:
        return None
    if isinstance(value, str):
        items = [value]
    else:
        items = list(value)
    tokens: list[str] = []
    for item in items:
        tokens.extend(t.strip() for t in str(item).split(",") if t.strip())
    return tokens or None


def build_filters(
    *,
    teams: Optional["list[str] | str"] = None,
    tournaments: Optional["list[str] | str"] = None,
    countries: Optional["list[str] | str"] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
) -> Optional[FilterParams]:
    """Single entry point for constructing ``FilterParams`` from raw inputs.

    Accepts both repeated query parameters (``list[str]``) and
    comma-separated strings (e.g. from the LLM executor / MCP server),
    normalizing them consistently. Returns ``None`` when no filter is set
    so callers can keep using ``None`` as the "no filter" sentinel.
    """
    params = FilterParams(
        teams=_normalize_list(teams),
        tournaments=_normalize_list(tournaments),
        countries=_normalize_list(countries),
        date_from=date_from.strip() if date_from else None,
        date_to=date_to.strip() if date_to else None,
    )
    return None if params.is_empty else params


def apply_filters(df: pd.DataFrame, filters: Optional[FilterParams]) -> pd.DataFrame:
    """Apply ``filters`` to the results DataFrame.

    Returns a **new** DataFrame (copy) -- the original is never mutated.
    If ``filters`` is ``None`` the original frame is returned unchanged.
    """
    if filters is None:
        return df

    result = df.copy()

    if filters.teams:
        result = result[
            result["home_team"].isin(filters.teams)
            | result["away_team"].isin(filters.teams)
        ]

    if filters.tournaments:
        result = result[result["tournament"].isin(filters.tournaments)]

    if filters.countries:
        result = result[result["country"].isin(filters.countries)]

    if filters.date_from:
        result = result[result["date"] >= pd.Timestamp(filters.date_from)]

    if filters.date_to:
        result = result[result["date"] <= pd.Timestamp(filters.date_to)]

    return result
