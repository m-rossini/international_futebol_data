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
