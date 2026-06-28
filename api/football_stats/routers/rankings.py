"""Ranking endpoints: /most/{stat} for teams/countries/cities, and /elo-ranking/*."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from football_stats.routers.dependencies import (
    FilterParamsDep,
    MostStat,
    engine,
    require_data,
    state,
)
from football_stats.stats.models import TeamRankingResponse

logger = logging.getLogger("stats.server.rankings")

router = APIRouter(tags=["Rankings"])


@router.get("/most/{stat}", response_model=TeamRankingResponse)
async def most_endpoint(
    stat: MostStat,
    top_n: int = Query(20, ge=1, le=500),
    filters: FilterParamsDep = Depends(),
):
    """Ranking of top N by a stat. Optional filters: ``?tournaments=FIFA+World+Cup&date_from=2000``"""
    require_data()
    logger.debug("GET /most/%s?top_n=%d", stat.value, top_n)
    return engine.most(stat.value, top_n, filters.inner)


# =========================================================================
#  ELO World Rankings (calculated from match results)
# =========================================================================


@router.get("/elo-ranking/current")
async def elo_ranking_current(
    top_n: int = Query(
        50, ge=1, le=211, description="Number of top-ranked teams to return"
    ),
):
    """Current ELO World Rankings (calculated from historical match results)."""
    require_data()
    if state.elo_ratings is None:
        raise HTTPException(503, "ELO ratings not calculated yet.")

    # Get latest ELO for each team
    from football_stats.stats.elo import get_latest_elo

    latest = get_latest_elo(state.elo_ratings, top_n=top_n)

    if latest.empty:
        raise HTTPException(503, "No ELO data available.")

    return {
        "calculation_date": str(state.elo_ratings["date"].max().date()),
        "total_teams": len(latest),
        "top_n": top_n,
        "ranking": latest.to_dict(orient="records"),
    }


@router.get("/elo-ranking/history/{team}")
async def elo_ranking_history(
    team: str,
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
):
    """Historical ELO rating for a specific team."""
    require_data()
    if state.elo_ratings is None:
        raise HTTPException(503, "ELO ratings not calculated yet.")

    from football_stats.stats.elo import get_team_elo_history

    df = get_team_elo_history(state.elo_ratings, team)

    if df.empty:
        raise HTTPException(404, f"Team '{team}' not found in ELO ratings.")

    if date_from:
        df = df[df["date"] >= date_from]
    if date_to:
        df = df[df["date"] <= date_to]

    df = df.sort_values("date")
    return {
        "team": team,
        "matches_calculated": len(df),
        "from": str(df["date"].min().date()),
        "to": str(df["date"].max().date()),
        "min_elo": float(df["elo_rating_new"].min()),
        "max_elo": float(df["elo_rating_new"].max()),
        "current_elo": float(df["elo_rating_new"].iloc[-1]),
        "history": df.to_dict(orient="records"),
    }


@router.get("/elo-ranking/decade-leaders")
async def elo_decade_leaders(
    top_n: int = Query(5, ge=1, le=10, description="Number of top teams per decade"),
    decade: Optional[str] = Query(
        None, description="Filter to specific decade (e.g. '2000s')"
    ),
):
    """Top teams by average ELO rating per decade. Shows which teams dominated each era."""
    require_data()
    if state.elo_ratings is None:
        raise HTTPException(503, "ELO ratings not calculated yet.")

    from football_stats.stats.elo import get_decade_leaders

    decades = [decade] if decade else None
    result = get_decade_leaders(state.elo_ratings, decades=decades, top_n=top_n)

    if not result:
        raise HTTPException(404, "No decade data available.")

    return {
        "decades": result,
        "total_decades": len(result),
    }


@router.get("/elo-ranking/summary")
async def elo_ranking_summary():
    """Summary statistics for ELO ratings."""
    require_data()
    if state.elo_ratings is None:
        raise HTTPException(503, "ELO ratings not calculated yet.")

    from football_stats.stats.elo import get_latest_elo

    latest = get_latest_elo(state.elo_ratings, top_n=300)

    return {
        "total_matches_calculated": len(state.elo_ratings),
        "total_teams": len(latest),
        "min_elo": float(latest["elo_rating"].min()),
        "max_elo": float(latest["elo_rating"].max()),
        "mean_elo": float(latest["elo_rating"].mean()),
        "median_elo": float(latest["elo_rating"].median()),
        "date_range": {
            "from": str(state.elo_ratings["date"].min().date()),
            "to": str(state.elo_ratings["date"].max().date()),
        },
        "top_10": latest.head(10).to_dict(orient="records"),
    }


@router.get("/elo-ranking/at-date")
async def elo_ranking_at_date(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
):
    """ELO ratings for a specific date.

    Returns every team that played a match on that exact date, with their
    post-match ELO rating. If no matches occurred that day, returns an
    empty list.
    """
    require_data()
    if state.elo_ratings is None:
        raise HTTPException(503, "ELO ratings not calculated yet.")

    from football_stats.stats.elo import get_elo_by_date

    df = get_elo_by_date(state.elo_ratings, date)

    return {
        "date": date,
        "total_entries": len(df),
        "entries": df.to_dict(orient="records"),
    }
