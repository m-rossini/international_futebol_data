"""Dixon-Coles Monte Carlo match simulation endpoint."""

import logging

from fastapi import APIRouter, Depends, Query

from football_stats.routers.dependencies import FilterParamsDep, engine, require_data
from football_stats.stats.models import SimulationResponse
from football_stats.stats.simulation import SimulationConfig, simulate_h2h

logger = logging.getLogger("stats.server.simulation")

router = APIRouter(tags=["Simulation"])


@router.get("/simulate", response_model=SimulationResponse)
async def simulate_match(
    team1: str = Query(..., description="First team name"),
    team2: str = Query(..., description="Second team name"),
    n_simulations: int = Query(
        1200, ge=100, le=100000, description="Number of Monte Carlo simulations"
    ),
    use_elo: bool = Query(
        False, description="Use ELO-based approximation instead of Dixon-Coles fit"
    ),
    half_life_years: float = Query(
        3.0, gt=0, description="Time-decay half-life in years for Dixon-Coles fit"
    ),
    filters: FilterParamsDep = Depends(),
):
    """Run a Dixon-Coles Monte Carlo simulation for a head-to-head matchup.

    Returns win/draw/loss probabilities, expected goals, and a score-pair
    histogram.  Uses only real historical match data — no mock values.

    Query parameters:
    - ``team1``, ``team2``: team names (required)
    - ``n_simulations``: Monte Carlo draws (default 1200, max 100000)
    - ``use_elo``: if true, use the faster ELO-based goal expectancy instead
      of fitting a Dixon–Coles attack/defence model
    - ``half_life_years``: time-decay half-life for the Dixon–Coles fit
    - Optional filters (tournaments, countries, date_from, date_to) restrict
      the matches used for fitting
    """
    require_data()
    logger.debug(
        "GET /simulate?team1=%s&team2=%s&n_simulations=%d&use_elo=%s",
        team1,
        team2,
        n_simulations,
        use_elo,
    )

    results_df = engine._state.enriched

    cfg = SimulationConfig(
        n_simulations=n_simulations,
        half_life_years=half_life_years,
        use_elo=use_elo,
    )

    result = simulate_h2h(
        team1=team1,
        team2=team2,
        results_df=results_df,
        elo_ratings=engine._state.elo_ratings,
        config=cfg,
    )

    return SimulationResponse(
        team1=result.team1,
        team2=result.team2,
        team1_win_prob=result.team1_win_prob,
        draw_prob=result.draw_prob,
        team2_win_prob=result.team2_win_prob,
        team1_expected_goals=result.team1_expected_goals,
        team2_expected_goals=result.team2_expected_goals,
        n_simulations=result.n_simulations,
        score_histogram=result.score_histogram,
        most_likely_score=result.most_likely_score,
        method=result.method,
        rho=result.rho,
        n_matches_used=result.n_matches_used,
        error=result.error,
    )
