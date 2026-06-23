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

        # computed rates
        agg["win_rate"] = round(agg["home_wins"] / agg["matches"] * 100, 1)
        agg["loss_rate"] = round(agg["away_wins"] / agg["matches"] * 100, 1)

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

        # -- per-team aggregates for multi-category rankings --
        home = df[["home_team", "home_score", "away_score"]].copy()
        home.columns = ["team", "goals_for", "goals_against"]
        away = df[["away_team", "away_score", "home_score"]].copy()
        away.columns = ["team", "goals_for", "goals_against"]
        combined = pd.concat([home, away], ignore_index=True)

        per_team = combined.groupby("team").agg(
            matches_played=("goals_for", "count"),
            goals_for=("goals_for", "sum"),
            goals_against=("goals_against", "sum"),
        ).reset_index()

        hw = df[df["home_win"] == 1].groupby("home_team").size()
        aw = df[df["away_win"] == 1].groupby("away_team").size()
        hl = df[(df["home_win"] == 0) & (df["draw"] == 0)].groupby("home_team").size()
        al = df[(df["away_win"] == 0) & (df["draw"] == 0)].groupby("away_team").size()
        hd = df[df["draw"] == 1].groupby("home_team").size()
        ad = df[df["draw"] == 1].groupby("away_team").size()

        def _safe_add(s1, s2):
            return s1.add(s2, fill_value=0)

        wins = _safe_add(hw, aw)
        losses = _safe_add(hl, al)
        team_draws = _safe_add(hd, ad)

        per_team = per_team.merge(wins.rename("wins"), left_on="team", right_index=True, how="left")
        per_team = per_team.merge(losses.rename("losses"), left_on="team", right_index=True, how="left")
        per_team = per_team.merge(team_draws.rename("draws"), left_on="team", right_index=True, how="left")
        per_team = per_team.fillna(0)
        for col in ["wins", "losses", "draws", "goals_for", "goals_against"]:
            if col in per_team.columns:
                per_team[col] = per_team[col].astype(int)
        per_team["goal_diff"] = per_team["goals_for"] - per_team["goals_against"]

        def _top_n(pdf, col, n):
            return pdf.nlargest(n, col)[["team", col]].rename(columns={col: "value"}).to_dict(orient="records")

        multi_top_teams = {
            "by_wins": _top_n(per_team, "wins", top_n),
            "by_losses": _top_n(per_team, "losses", top_n),
            "by_draws": _top_n(per_team, "draws", top_n),
            "by_goals_for": _top_n(per_team, "goals_for", top_n),
            "by_goals_against": _top_n(per_team, "goals_against", top_n),
            "by_goal_diff": _top_n(per_team, "goal_diff", top_n),
        }

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
            "top_teams_by_wins": multi_top_teams["by_wins"],
            "top_teams": multi_top_teams,
            "top_tournaments": [{"tournament": t, "matches": int(m)} for t, m in top_tournaments.items()],
        }
        if extra_summary:
            summary.update(extra_summary)

        return {
            self._label: canonical,
            "summary": summary,
        }
