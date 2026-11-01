"""Confederation endpoints: list confederations, confederation detail."""

import logging
from dataclasses import replace
from typing import Optional

import pandas as pd
from fastapi import APIRouter, Depends

from football_stats.routers.dependencies import FilterParamsDep, engine, require_data
from football_stats.stats.filters import (
    CONFEDERATION_ORDER,
    FilterParams,
    get_countries_by_confederation,
    get_teams_by_confederation,
    list_all_confederations,
)

logger = logging.getLogger("stats.server.confederations")

router = APIRouter(tags=["Confederations"])


def _normalise(name: str) -> Optional[str]:
    """Return the canonical confederation code, or None if unknown."""
    code = name.strip().upper()
    return code if code in CONFEDERATION_ORDER else None


def _matches_for(confederation: str, filters: FilterParams) -> pd.DataFrame:
    """Enriched matches involving a team of ``confederation``, plus user filters."""
    scoped = replace(filters, confederations=[confederation])
    return engine._enriched_filtered(scoped)


def _unknown(confederation_name: str) -> dict:
    return {
        "error": True,
        "message": f"Unknown confederation '{confederation_name}'. "
        f"Valid: {', '.join(CONFEDERATION_ORDER)}",
    }


@router.get("/confederations")
async def confederations_endpoint():
    """List the six FIFA confederations with their member countries."""
    logger.debug("GET /confederations")
    return list_all_confederations()


@router.get("/confederation/{confederation_name}")
async def confederation_detail(
    confederation_name: str,
    filters: FilterParamsDep = Depends(),
):
    """Summary stats for one confederation (matches, goals, teams, tournaments).

    Extra filter params (``?tournaments=``, ``?date_from=``, …) narrow the
    result further, on top of the confederation from the path.
    """
    require_data()
    code = _normalise(confederation_name)
    if code is None:
        return _unknown(confederation_name)
    logger.debug("GET /confederation/%s", code)

    df = _matches_for(code, filters.inner)
    matches = len(df)
    total_goals = int(df["total_goals"].sum()) if matches else 0
    teams = set(df["home_team"]).union(set(df["away_team"])) if matches else set()
    tournaments = sorted(df["tournament"].dropna().unique().tolist()) if matches else []

    return {
        "confederation": code,
        "countries": get_countries_by_confederation(code),
        "teams": get_teams_by_confederation(code),
        "total_matches": matches,
        "total_goals": total_goals,
        "unique_teams": len(teams),
        "tournaments": tournaments,
    }


@router.get("/confederation/{confederation_name}/matches")
async def confederation_matches(
    confederation_name: str,
    filters: FilterParamsDep = Depends(),
):
    """Match list for one confederation, with optional extra filters."""
    require_data()
    code = _normalise(confederation_name)
    if code is None:
        return _unknown(confederation_name)
    logger.debug("GET /confederation/%s/matches", code)

    df = _matches_for(code, filters.inner)

    def _score(value) -> Optional[int]:
        return int(value) if pd.notna(value) else None

    match_summary = [
        {
            "date": str(row["date"])[:10],
            "home_team": row["home_team"],
            "away_team": row["away_team"],
            "home_score": _score(row["home_score"]),
            "away_score": _score(row["away_score"]),
            "tournament": row["tournament"],
            "city": row["city"],
            "country": row["country"],
            "goals": int(row["total_goals"] or 0),
        }
        for _, row in df.iterrows()
    ]

    return {
        "confederation": code,
        "matches": match_summary,
        "total": len(match_summary),
    }
