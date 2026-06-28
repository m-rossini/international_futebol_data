"""Ranking endpoints: /most/{stat} for teams/countries/cities, and /fifa-ranking/*, /elo-ranking/*."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from football_stats.routers.dependencies import FilterParamsDep, MostStat, engine, require_data, state
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
#  FIFA World Rankings
# =========================================================================

@router.get("/fifa-ranking/current")
async def fifa_ranking_current(
    top_n: int = Query(50, ge=1, le=211, description="Number of top-ranked countries to return"),
):
    """Current FIFA World Ranking (most recent snapshot)."""
    require_data()
    if state.fifa_ranking is None:
        raise HTTPException(503, "FIFA ranking data not loaded.")
    latest_date = state.fifa_ranking["rank_date"].max()
    df = state.fifa_ranking[state.fifa_ranking["rank_date"] == latest_date]
    df = df.sort_values("rank").head(top_n)
    return {
        "rank_date": str(latest_date.date()),
        "top_n": top_n,
        "ranking": df.to_dict(orient="records"),
    }


@router.get("/fifa-ranking/history/{country}")
async def fifa_ranking_history(
    country: str,
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
):
    """Historical FIFA ranking for a specific country."""
    require_data()
    if state.fifa_ranking is None:
        raise HTTPException(503, "FIFA ranking data not loaded.")

    df = state.fifa_ranking[
        state.fifa_ranking["country_full"].str.lower() == country.lower()
    ].copy()

    if df.empty:
        raise HTTPException(404, f"Country '{country}' not found in FIFA rankings.")

    if date_from:
        df = df[df["rank_date"] >= date_from]
    if date_to:
        df = df[df["rank_date"] <= date_to]

    df = df.sort_values("rank_date")
    return {
        "country": df["country_full"].iloc[0],
        "country_abrv": df["country_abrv"].iloc[0],
        "confederation": df["confederation"].iloc[0],
        "snapshots": len(df),
        "from": str(df["rank_date"].min().date()),
        "to": str(df["rank_date"].max().date()),
        "history": df.to_dict(orient="records"),
    }


@router.get("/fifa-ranking/snapshots")
async def fifa_ranking_snapshots():
    """List all available FIFA ranking snapshot dates."""
    require_data()
    if state.fifa_ranking is None:
        raise HTTPException(503, "FIFA ranking data not loaded.")
    dates = sorted(state.fifa_ranking["rank_date"].dt.date.unique(), reverse=True)
    return {
        "total_snapshots": len(dates),
        "from": str(dates[-1]),
        "to": str(dates[0]),
        "dates": [str(d) for d in dates],
    }


# =========================================================================
#  ELO World Rankings (calculated from match results)
# =========================================================================

@router.get("/elo-ranking/current")
async def elo_ranking_current(
    top_n: int = Query(50, ge=1, le=211, description="Number of top-ranked teams to return"),
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


# =========================================================================
#  Team-specific FIFA vs ELO history comparison
# =========================================================================

@router.get("/ranking-comparison/{team}")
async def ranking_comparison_team(
    team: str,
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    normalize: bool = Query(True, description="Normalize FIFA rank so lower=better matches ELO direction"),
):
    """Compare FIFA ranking history vs ELO rating history for a specific team over time."""
    require_data()
    if state.fifa_ranking is None or state.elo_ratings is None:
        raise HTTPException(503, "Both FIFA and ELO data are required.")

    # Get FIFA history
    fifa_df = state.fifa_ranking[
        state.fifa_ranking["country_full"].str.lower() == team.lower()
    ].copy()

    if fifa_df.empty:
        raise HTTPException(404, f"Team '{team}' not found in FIFA rankings.")

    if date_from:
        fifa_df = fifa_df[fifa_df["rank_date"] >= date_from]
    if date_to:
        fifa_df = fifa_df[fifa_df["rank_date"] <= date_to]
    fifa_df = fifa_df.sort_values("rank_date")

    # Get ELO history
    from football_stats.stats.elo import get_team_elo_history
    elo_df = get_team_elo_history(state.elo_ratings, team)

    if elo_df.empty:
        raise HTTPException(404, f"Team '{team}' not found in ELO ratings.")

    if date_from:
        elo_df = elo_df[elo_df["date"] >= date_from]
    if date_to:
        elo_df = elo_df[elo_df["date"] <= date_to]
    elo_df = elo_df.sort_values("date")

    # Build merged timeline: one entry per month (FIFA snapshots are monthly)
    # For each FIFA snapshot date, find the closest ELO rating
    import pandas as pd
    merged = []
    for _, frow in fifa_df.iterrows():
        fdate = frow["rank_date"]
        # Find ELO entry closest to this date
        elo_matches = elo_df[elo_df["date"] <= fdate]
        if not elo_matches.empty:
            closest_elo = elo_matches.iloc[-1]
            merged.append({
                "date": str(fdate.date()),
                "fifa_rank": int(frow["rank"]),
                "fifa_points": round(float(frow["total_points"]), 1),
                "elo_rating": round(float(closest_elo["elo_rating_new"]), 1),
                "fifa_rank_change": int(frow["rank_change"]) if pd.notna(frow.get("rank_change")) else 0,
            })

    return {
        "team": team,
        "confederation": fifa_df["confederation"].iloc[0],
        "country_abrv": fifa_df["country_abrv"].iloc[0],
        "fifa_snapshots": len(fifa_df),
        "elo_matches": len(elo_df),
        "merged_points": len(merged),
        "from": str(merged[0]["date"]) if merged else None,
        "to": str(merged[-1]["date"]) if merged else None,
        "timeline": merged,
    }


# =========================================================================
#  Comparative: FIFA vs ELO
# =========================================================================

@router.get("/ranking-comparison")
async def ranking_comparison(
    top_n: int = Query(30, ge=1, le=100, description="Number of top teams to compare"),
):
    """Compare FIFA World Rankings vs ELO ratings side by side."""
    require_data()
    if state.fifa_ranking is None or state.elo_ratings is None:
        raise HTTPException(503, "Both FIFA and ELO data are required.")

    # Latest FIFA snapshot
    latest_date = state.fifa_ranking["rank_date"].max()
    fifa_latest = state.fifa_ranking[state.fifa_ranking["rank_date"] == latest_date].copy()
    fifa_latest = fifa_latest.sort_values("rank").head(top_n)

    # Latest ELO
    from football_stats.stats.elo import get_latest_elo
    elo_latest = get_latest_elo(state.elo_ratings, top_n=top_n * 2)

    # Build comparison by matching on country name
    fifa_map = {}
    for _, row in fifa_latest.iterrows():
        name = row["country_full"].lower()
        fifa_map[name] = row

    comparison = []
    for _, erow in elo_latest.iterrows():
        team_name = erow["team"].lower()
        if team_name in fifa_map:
            frow = fifa_map[team_name]
            comparison.append({
                "team": erow["team"],
                "fifa_rank": int(frow["rank"]),
                "fifa_points": round(float(frow["total_points"]), 1),
                "elo_rank": int(erow["ranking"]),
                "elo_rating": round(float(erow["elo_rating"]), 1),
                "confederation": frow["confederation"],
                "country_abrv": frow["country_abrv"],
                "rank_difference": int(erow["ranking"]) - int(frow["rank"]),
            })

    comparison.sort(key=lambda x: x["fifa_rank"])
    return {
        "fifa_snapshot_date": str(latest_date.date()),
        "elo_calculation_date": str(state.elo_ratings["date"].max().date()),
        "total_matched": len(comparison),
        "comparison": comparison[:top_n],
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
