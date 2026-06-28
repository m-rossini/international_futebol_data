"""Match prediction endpoints using ELO ratings.

Uses the ELO expected-score formula to predict outcome probabilities
for any pairing of teams in the database.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query

from football_stats.routers.dependencies import require_data, state
from football_stats.stats.predictor import (
    find_upcoming_matches,
    get_latest_elo_map,
    predict_match,
)

router = APIRouter(tags=["Predictions"])


@router.get("/predict/{home_team}/{away_team}")
async def predict_single_match(
    home_team: str,
    away_team: str,
    neutral: bool = Query(False, description="If true, no home advantage is applied"),
):
    """Predict win/draw/loss probabilities for a single match using ELO ratings.

    Returns the probability of home win, draw, and away win based on
    each team's historical ELO rating and the standard ELO formula.
    """
    require_data()
    if state.elo_ratings is None:
        raise HTTPException(503, "ELO ratings not available.")

    elo_map = get_latest_elo_map(state.elo_ratings)
    result = predict_match(home_team, away_team, elo_map, neutral=neutral)

    # Check if teams were found
    home_lower = home_team.lower()
    away_lower = away_team.lower()
    unknowns = []
    if home_lower not in {k.lower() for k in elo_map}:
        unknowns.append(home_team)
    if away_lower not in {k.lower() for k in elo_map}:
        unknowns.append(away_team)
    if unknowns:
        result["unknown_teams"] = unknowns
        result["note"] = (
            "Some teams not found in historical data — using default ELO 1500."
        )

    return result


@router.get("/predict/upcoming")
async def predict_upcoming_matches(
    limit: int = Query(
        10, ge=1, le=50, description="Number of upcoming matches to predict"
    ),
    min_probability: float = Query(
        0.0,
        ge=0.0,
        le=1.0,
        description="Minimum confidence to include (0 = all)",
    ),
):
    """Predict outcomes for upcoming / future matches in the dataset.

    Finds matches scheduled for today or later and runs the ELO
    prediction for each one.
    """
    require_data()
    if state.elo_ratings is None or state.results is None:
        raise HTTPException(503, "Match results or ELO ratings not available.")

    elo_map = get_latest_elo_map(state.elo_ratings)
    upcoming = find_upcoming_matches(state.results, limit=limit)

    if not upcoming:
        return {
            "total_upcoming": 0,
            "predictions": [],
            "note": "No upcoming matches found in the dataset.",
        }

    predictions: list[dict[str, Any]] = []
    for match in upcoming:
        pred = predict_match(
            match["home_team"],
            match["away_team"],
            elo_map,
            neutral=bool(match.get("neutral", False)),
        )
        pred["date"] = (
            str(match["date"].date())
            if hasattr(match["date"], "date")
            else str(match["date"])
        )
        pred["tournament"] = match.get("tournament", "")
        predictions.append(pred)

    # Filter by minimum confidence
    if min_probability > 0:
        predictions = [p for p in predictions if p["confidence"] >= min_probability]

    return {
        "total_upcoming": len(predictions),
        "calculation_date": str(state.elo_ratings["date"].max().date()),
        "predictions": predictions,
    }


@router.get("/predict/head-to-head")
async def predict_head_to_head(
    home_team: str = Query(..., description="Home team name"),
    away_team: str = Query(..., description="Away team name"),
    at_neutral: bool = Query(False, description="If true, neutral venue"),
):
    """Alias for ``/predict/{home}/{away}`` with query parameters."""
    return await predict_single_match(home_team, away_team, neutral=at_neutral)
