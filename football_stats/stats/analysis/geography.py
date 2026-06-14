"""Parameterized geography analysis — shared base for city and country stats."""

from typing import Callable, Optional

import pandas as pd

from .enrich import enrich_match_results, strip_accents
from .winner import biggest_single_win


class GeographyStats:
    """Parameterized calculator for city or country stats.

    ``group_col`` is the DataFrame column name to group by (e.g. ``"city"``
    or ``"country"``). ``label`` is the human-readable name used in
    error messages (e.g. ``"city"`` or ``"country"``).
    """

    def __init__(self, group_col: str, label: str):
        self._group_col = group_col
        self._label = label

    def list_all(self, results: pd.DataFrame, extra_aggs: Optional[dict] = None) -> list:
        """List all entities with comprehensive stats, sorted by matches desc.

        ``extra_aggs`` can supply additional aggregation specs, e.g.::

            {"cities": ("city", pd.Series.nunique)}
        """
        df = enrich_match_results(results)

        base_aggs = {
            "matches": ("total_goals", "count"),
            "total_goals": ("total_goals", "sum"),
            "home_wins": ("home_win", "sum"),
            "away_wins": ("away_win", "sum"),
            "draws": ("draw", "sum"),
            "unique_teams": ("home_team", lambda x: len(set(x) | set(df.loc[x.index, "away_team"]))),
            "tournaments": ("tournament", pd.Series.nunique),
            "first_year": ("date", lambda x: x.dt.year.min()),
            "last_year": ("date", lambda x: x.dt.year.max()),
        }
        if extra_aggs:
            base_aggs.update(extra_aggs)

        agg = df.groupby(self._group_col).agg(**base_aggs).reset_index()

        agg["avg_goals"] = round(agg["total_goals"] / agg["matches"], 2)

        int_cols = ["matches", "total_goals", "home_wins", "away_wins", "draws",
                     "unique_teams", "tournaments"]
        for col in int_cols:
            if col in agg.columns:
                agg[col] = agg[col].astype(int)

        return agg.sort_values("matches", ascending=False).to_dict(orient="records")

    def info(
        self,
        results: pd.DataFrame,
        name: str,
        top_n: int = 10,
        extra_summary: Optional[dict] = None,
        post_process_biggest: Optional[Callable] = None,
    ) -> dict:
        """Comprehensive stats for a specific entity.

        ``extra_summary`` — additional key/value pairs to merge into the
        summary dict (e.g. ``{"unique_cities": 42, "top_cities": [...]}``).

        ``post_process_biggest`` — callable ``(biggest_dict, full_df)`` that
        can add extra fields (e.g. ``city`` or ``tournament``) to the biggest
        win entry.
        """
        name_key = strip_accents(name).lower()
        mask = results[self._group_col].apply(
            lambda x: strip_accents(x).lower()
        ) == name_key
        df = results[mask].copy()
        if df.empty:
            raise ValueError(f"Unknown {self._label}: '{name}'")

        canonical = df[self._group_col].iloc[0]
        df = enrich_match_results(df)

        matches = len(df)
        total_goals = int(df["total_goals"].sum())
        avg_goals = round(total_goals / matches, 2) if matches else 0
        home_wins = int(df["home_win"].sum())
        away_wins = int(df["away_win"].sum())
        draws = int(df["draw"].sum())
        unique_teams = int(pd.concat([df["home_team"], df["away_team"]]).nunique())
        unique_tournaments = int(df["tournament"].nunique())
        first_year = int(df["year"].min())
        last_year = int(df["year"].max())

        # biggest win
        biggest_win = biggest_single_win(df)
        if biggest_win is not None and post_process_biggest is not None:
            bw_row = df.nlargest(1, "goal_diff").iloc[0]
            biggest_win = post_process_biggest(biggest_win, bw_row)

        # top teams
        top_teams = df["winner"].value_counts().head(top_n)

        # top tournaments
        top_tournaments = df["tournament"].value_counts().head(top_n)

        summary = {
            "matches": matches,
            "first_year": first_year,
            "last_year": last_year,
            "total_goals": total_goals,
            "avg_goals_per_match": avg_goals,
            "home_wins": home_wins,
            "away_wins": away_wins,
            "draws": draws,
            "unique_teams": unique_teams,
            "unique_tournaments": unique_tournaments,
            "biggest_win": biggest_win,
            "top_teams_by_wins": [{"team": t, "wins": int(w)} for t, w in top_teams.items()],
            "top_tournaments": [{"tournament": t, "matches": int(m)} for t, m in top_tournaments.items()],
        }
        if extra_summary:
            summary.update(extra_summary)

        return {
            self._label: canonical,
            "summary": summary,
        }
