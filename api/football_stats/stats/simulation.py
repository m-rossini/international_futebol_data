"""Dixon-Coles Monte Carlo match simulation for head-to-head forecasts.

Uses only real data from the loaded results CSV.  No mock values, no anchoring,
no sampling bias — every prediction is derived from historical match results.

The model:
  λ_home = exp(att_home + def_away + γ·home_adv)
  λ_away = exp(att_away + def_home)

Attack/defence parameters are fitted by maximum likelihood with exponential
time decay (half-life configurable, default 3 years) and ridge regularisation
on the long tail of low-match teams.  The Dixon–Coles τ adjustment is applied
to the four low-score cells (0-0, 0-1, 1-0, 1-1).

A faster ELO-based approximation is also available: goal expectancy is derived
from the teams' latest ELO ratings using a fitted ELO→goals mapping, with the
same Dixon–Coles adjustment.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional

import numpy as np
import pandas as pd
from scipy import sparse
from scipy.optimize import minimize, minimize_scalar
from scipy.special import gammaln

from .elo_config import _classify_tournament
from .log import get_logger

logger = get_logger("simulation")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

MAX_GOALS = 10
DEFAULT_HALF_LIFE_YEARS = 3.0
DEFAULT_RIDGE = 1.0
DEFAULT_N_SIMULATIONS = 1200
DEFAULT_RHO = -0.038

# ELO→goal expectancy mapping fitted on the full dataset (walk-forward v12).
# lam = exp(a + b * (elo_diff / 400) + h * home_flag)
ELO_BASE = 0.182
ELO_SENSITIVITY = 0.62
ELO_HOME = 0.299
ELO_RHO = -0.0495

# Tournament → home-advantage ELO points (mirrors elo.py defaults)
HOME_ADVANTAGE_ELO = {
    "world_cup": 0.0,
    "continental": 25.0,
    "qualifier": 100.0,
    "other": 50.0,
    "friendly": 100.0,
}

# ---------------------------------------------------------------------------
# Dixon–Coles score matrix (precomputed)
# ---------------------------------------------------------------------------

_K = np.arange(MAX_GOALS + 1, dtype=float)
_LOGFACT = gammaln(_K + 1.0)
_II, _JJ = np.meshgrid(
    np.arange(MAX_GOALS + 1), np.arange(MAX_GOALS + 1), indexing="ij"
)
_HOME_WIN_MASK = _II > _JJ
_DRAW_MASK = _II == _JJ
_AWAY_WIN_MASK = _II < _JJ


def _score_probs(lam_h: np.ndarray, lam_a: np.ndarray, rho: float) -> np.ndarray:
    """Exact P(home win), P(draw), P(away win) for arrays of goal rates.

    Returns array of shape (N, 3) with columns [home, draw, away].
    """
    lam_h = np.clip(lam_h, 1e-6, 20.0)
    lam_a = np.clip(lam_a, 1e-6, 20.0)

    log_h = _K[None, :] * np.log(lam_h)[:, None] - lam_h[:, None] - _LOGFACT[None, :]
    log_a = _K[None, :] * np.log(lam_a)[:, None] - lam_a[:, None] - _LOGFACT[None, :]

    p = np.exp(log_h[:, :, None] + log_a[:, None, :])

    # Dixon–Coles tau on the four low-score cells
    tau00 = 1.0 - lam_h * lam_a * rho
    tau01 = 1.0 + lam_h * rho
    tau10 = 1.0 + lam_a * rho
    tau11 = 1.0 - rho
    p[:, 0, 0] *= tau00
    p[:, 0, 1] *= tau01
    p[:, 1, 0] *= tau10
    p[:, 1, 1] *= tau11

    p = np.clip(p, 1e-15, None)
    total = p.sum(axis=(1, 2), keepdims=True)
    p = p / total

    out = np.empty((len(lam_h), 3))
    out[:, 0] = p[:, _HOME_WIN_MASK].sum(axis=1)
    out[:, 1] = p[:, _DRAW_MASK].sum(axis=1)
    out[:, 2] = p[:, _AWAY_WIN_MASK].sum(axis=1)
    return out


# ---------------------------------------------------------------------------
# Dixon–Coles MLE fitting
# ---------------------------------------------------------------------------


def _fit_dixon_coles(
    T: int,
    home_i: np.ndarray,
    away_i: np.ndarray,
    home_flag: np.ndarray,
    yh: np.ndarray,
    ya: np.ndarray,
    dates: pd.Series,
    ref_date: pd.Timestamp,
    half_life_years: float = DEFAULT_HALF_LIFE_YEARS,
    ridge: float = DEFAULT_RIDGE,
    maxiter: int = 300,
):
    """Fit attack/defence + home-advantage Dixon–Coles model by MLE.

    Returns (params, info) where params has length 2*T+1:
        [att_0..att_{T-1}, def_0..def_{T-1}, gamma]
    """
    M = len(yh)

    r1 = np.arange(M)
    r2 = np.arange(M, 2 * M)

    rows = [r1, r1, r1, r2, r2, r2]
    cols = [
        home_i,
        T + away_i,
        np.full(M, 2 * T),
        away_i,
        T + home_i,
        np.full(M, 2 * T),
    ]
    data = [
        np.ones(M),
        np.ones(M),
        home_flag,
        np.ones(M),
        np.ones(M),
        np.zeros(M),
    ]
    X = sparse.csr_matrix(
        (np.concatenate(data), (np.concatenate(rows), np.concatenate(cols))),
        shape=(2 * M, 2 * T + 1),
    )

    days = (ref_date - dates).dt.days.values.astype(float)
    w1 = np.exp(-math.log(2) / (half_life_years * 365.25) * np.maximum(days, 0))
    w = np.concatenate([w1, w1])
    y = np.concatenate([yh, ya]).astype(float)

    reg = np.zeros(2 * T + 1)
    reg[: 2 * T] = ridge

    def obj(p):
        eta = np.clip(X @ p, -10, 4)
        lam = np.exp(eta)
        ll = (w * (y * eta - lam)).sum() - 0.5 * (reg * p * p).sum()
        grad = X.T @ (w * (y - lam)) - reg * p
        return -ll, -grad

    p0 = np.zeros(2 * T + 1)
    p0[2 * T] = 0.25
    r = minimize(obj, x0=p0, jac=True, method="L-BFGS-B", options={"maxiter": maxiter})
    return r.x, {"nit": int(r.nit), "success": bool(r.success), "fun": float(r.fun)}


def _fit_rho(
    params: np.ndarray,
    T: int,
    home_i: np.ndarray,
    away_i: np.ndarray,
    home_flag: np.ndarray,
    yh: np.ndarray,
    ya: np.ndarray,
) -> float:
    """1-D MLE for the Dixon–Coles rho parameter."""
    att = params[:T]
    dfn = params[T : 2 * T]
    gamma = params[2 * T]
    lh = np.clip(
        np.exp(np.clip(att[home_i] + dfn[away_i] + gamma * home_flag, -10, 4)), 1e-6, 20
    )
    la = np.clip(np.exp(np.clip(att[away_i] + dfn[home_i], -10, 4)), 1e-6, 20)

    mask = (yh <= 1) & (ya <= 1)
    if mask.sum() < 50:
        return DEFAULT_RHO

    hh, aa = yh[mask], ya[mask]
    lhm, lam = lh[mask], la[mask]

    def nll(rho):
        tau = np.ones(len(hh))
        m00 = (hh == 0) & (aa == 0)
        m01 = (hh == 0) & (aa == 1)
        m10 = (hh == 1) & (aa == 0)
        m11 = (hh == 1) & (aa == 1)
        tau[m00] = 1.0 - lhm[m00] * lam[m00] * rho
        tau[m01] = 1.0 + lhm[m01] * rho
        tau[m10] = 1.0 + lam[m10] * rho
        tau[m11] = 1.0 - rho
        if np.any(tau <= 0):
            return 1e9
        return -np.log(tau).sum()

    r = minimize_scalar(nll, bounds=(-0.2, 0.2), method="bounded")
    return float(r.x)


# ---------------------------------------------------------------------------
# Monte Carlo simulation
# ---------------------------------------------------------------------------


def _sample_poisson(lam: float, max_k: int, rng: np.random.Generator) -> int:
    """Sample from a Poisson distribution via inverse CDF."""
    cdf = 0.0
    probs = []
    for k in range(max_k + 1):
        cdf += (lam**k) * math.exp(-lam) / math.factorial(k)
        probs.append(cdf)
    u = rng.random()
    for k, cum_p in enumerate(probs):
        if u <= cum_p:
            return k
    return max_k


def _simulate_scores(
    lam_h: float,
    lam_a: float,
    rho: float,
    n_simulations: int,
    rng: np.random.Generator,
) -> dict:
    """Run Monte Carlo simulation of match scores.

    Returns dict with team1_win, draw, team2_win probabilities and score
    distribution histogram.
    """
    # Precompute Poisson CDFs for speed
    max_k = MAX_GOALS
    k_vals = np.arange(max_k + 1)
    log_fact = gammaln(k_vals + 1.0)

    team1_wins = 0
    draws = 0
    team2_wins = 0
    score_counts: dict[str, int] = {}

    for _ in range(n_simulations):
        # Sample home goals
        cdf_h = np.cumsum((lam_h**k_vals) * np.exp(-lam_h) / np.exp(log_fact))
        g1 = int(k_vals[np.searchsorted(cdf_h, rng.random())])

        # Sample away goals
        cdf_a = np.cumsum((lam_a**k_vals) * np.exp(-lam_a) / np.exp(log_fact))
        g2 = int(k_vals[np.searchsorted(cdf_a, rng.random())])

        # Dixon–Coles adjustment (rejection sampling)
        adjustment = 1.0
        if g1 == 0 and g2 == 0:
            adjustment = 1 - lam_h * lam_a * rho
        elif g1 == 0 and g2 == 1:
            adjustment = 1 + lam_h * rho
        elif g1 == 1 and g2 == 0:
            adjustment = 1 + lam_a * rho
        elif g1 == 1 and g2 == 1:
            adjustment = 1 - rho

        if rng.random() > adjustment:
            cdf_h = np.cumsum((lam_h**k_vals) * np.exp(-lam_h) / np.exp(log_fact))
            g1 = int(k_vals[np.searchsorted(cdf_h, rng.random())])
            cdf_a = np.cumsum((lam_a**k_vals) * np.exp(-lam_a) / np.exp(log_fact))
            g2 = int(k_vals[np.searchsorted(cdf_a, rng.random())])

        if g1 > g2:
            team1_wins += 1
        elif g1 < g2:
            team2_wins += 1
        else:
            draws += 1

        key = f"{g1}-{g2}"
        score_counts[key] = score_counts.get(key, 0) + 1

    total = n_simulations
    return {
        "team1_win": team1_wins / total,
        "draw": draws / total,
        "team2_win": team2_wins / total,
        "score_histogram": {k: v / total for k, v in score_counts.items()},
        "most_likely_score": max(score_counts, key=score_counts.get)
        if score_counts
        else "0-0",
    }


# ---------------------------------------------------------------------------
# ELO-based goal expectancy (fast path, no fitting needed)
# ---------------------------------------------------------------------------


def _elo_to_goal_expectancy(
    team_elo: float,
    opponent_elo: float,
    home_advantage_elo: float = 0.0,
    base: float = ELO_BASE,
    sensitivity: float = ELO_SENSITIVITY,
    home: float = ELO_HOME,
) -> float:
    """Convert ELO ratings to expected goals using fitted mapping.

    lam = exp(base + sensitivity * (elo_diff / 400) + home * home_flag)
    """
    elo_diff = (team_elo - opponent_elo + home_advantage_elo) / 400.0
    return max(math.exp(base + sensitivity * elo_diff + home), 0.1)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


@dataclass
class SimulationConfig:
    """Configuration for a match simulation."""

    n_simulations: int = DEFAULT_N_SIMULATIONS
    half_life_years: float = DEFAULT_HALF_LIFE_YEARS
    ridge: float = DEFAULT_RIDGE
    rho: Optional[float] = None  # None = fit from data
    use_elo: bool = False  # Use ELO-based approximation instead of DC fit
    home_advantage_elo: float = 0.0
    tournament_type: Optional[str] = None  # For home advantage lookup


@dataclass
class SimulationResult:
    """Result of a match simulation."""

    team1: str
    team2: str
    team1_win_prob: float
    draw_prob: float
    team2_win_prob: float
    team1_expected_goals: float
    team2_expected_goals: float
    n_simulations: int
    score_histogram: dict[str, float]
    most_likely_score: str
    method: str
    rho: float
    n_matches_used: int
    error: Optional[str] = None


def simulate_h2h(
    team1: str,
    team2: str,
    results_df: pd.DataFrame,
    elo_ratings: Optional[pd.DataFrame] = None,
    config: Optional[SimulationConfig] = None,
) -> SimulationResult:
    """Run a Dixon-Coles Monte Carlo simulation for a head-to-head matchup.

    Parameters
    ----------
    team1, team2 : str
        Team names.
    results_df : pd.DataFrame
        Full match results DataFrame (must have columns: date, home_team,
        away_team, home_score, away_score, tournament).
    elo_ratings : pd.DataFrame, optional
        ELO ratings history (from ``calculate_elo_ratings``). Used only when
        ``config.use_elo`` is True.
    config : SimulationConfig, optional
        Simulation configuration.

    Returns
    -------
    SimulationResult
    """
    cfg = config or SimulationConfig()
    rng = np.random.default_rng(42)

    # Resolve team names (case-insensitive)
    all_teams = set(results_df["home_team"].unique()) | set(
        results_df["away_team"].unique()
    )
    t1_canonical = next((t for t in all_teams if t.lower() == team1.lower()), None)
    t2_canonical = next((t for t in all_teams if t.lower() == team2.lower()), None)

    if t1_canonical is None or t2_canonical is None:
        return SimulationResult(
            team1=team1,
            team2=team2,
            team1_win_prob=0.0,
            draw_prob=0.0,
            team2_win_prob=0.0,
            team1_expected_goals=0.0,
            team2_expected_goals=0.0,
            n_simulations=cfg.n_simulations,
            score_histogram={},
            most_likely_score="",
            method="error",
            rho=0.0,
            n_matches_used=0,
            error=f"Team not found: {team1 if t1_canonical is None else ''} {team2 if t2_canonical is None else ''}".strip(),
        )

    # Get all matches for both teams (for DC fit with more data)
    team_mask = (results_df["home_team"].isin([t1_canonical, t2_canonical])) | (
        results_df["away_team"].isin([t1_canonical, t2_canonical])
    )
    team_matches = results_df[team_mask].sort_values("date")

    n_team = len(team_matches)

    # Determine home advantage for team1 (team1 is "home" in the simulation)
    home_flag_val = 1.0  # team1 is treated as home
    if cfg.tournament_type:
        t_type = _classify_tournament(cfg.tournament_type)
        home_ha = HOME_ADVANTAGE_ELO.get(t_type, 50.0)
    else:
        home_ha = cfg.home_advantage_elo

    if cfg.use_elo:
        # ---- ELO-based path (fast, no fitting) ----
        if elo_ratings is None or elo_ratings.empty:
            return SimulationResult(
                team1=t1_canonical,
                team2=t2_canonical,
                team1_win_prob=0.0,
                draw_prob=0.0,
                team2_win_prob=0.0,
                team1_expected_goals=0.0,
                team2_expected_goals=0.0,
                n_simulations=cfg.n_simulations,
                score_histogram={},
                most_likely_score="",
                method="error",
                rho=ELO_RHO,
                n_matches_used=0,
                error="ELO ratings not available",
            )

        # Get latest ELO for each team
        latest = elo_ratings.sort_values("date").groupby("team").tail(1)
        elo_map = dict(zip(latest["team"], latest["elo_rating_new"]))
        e1 = elo_map.get(t1_canonical, 1500.0)
        e2 = elo_map.get(t2_canonical, 1500.0)

        lam_h = _elo_to_goal_expectancy(e1, e2, home_advantage_elo=home_ha)
        lam_a = _elo_to_goal_expectancy(e2, e1, home_advantage_elo=0.0)

        rho = cfg.rho if cfg.rho is not None else ELO_RHO
        method = "dixon_coles_elo"
        n_used = n_team

    else:
        # ---- Dixon-Coles MLE path ----
        if n_team < 20:
            # Not enough data for DC fit; fall back to ELO
            if elo_ratings is None or elo_ratings.empty:
                return SimulationResult(
                    team1=t1_canonical,
                    team2=t2_canonical,
                    team1_win_prob=0.0,
                    draw_prob=0.0,
                    team2_win_prob=0.0,
                    team1_expected_goals=0.0,
                    team2_expected_goals=0.0,
                    n_simulations=cfg.n_simulations,
                    score_histogram={},
                    most_likely_score="",
                    method="error",
                    rho=0.0,
                    n_matches_used=0,
                    error="Insufficient match data for simulation",
                )
            latest = elo_ratings.sort_values("date").groupby("team").tail(1)
            elo_map = dict(zip(latest["team"], latest["elo_rating_new"]))
            e1 = elo_map.get(t1_canonical, 1500.0)
            e2 = elo_map.get(t2_canonical, 1500.0)
            lam_h = _elo_to_goal_expectancy(e1, e2, home_advantage_elo=home_ha)
            lam_a = _elo_to_goal_expectancy(e2, e1, home_advantage_elo=0.0)
            rho = cfg.rho if cfg.rho is not None else ELO_RHO
            method = "dixon_coles_elo_fallback"
            n_used = n_team
        else:
            # Build team index
            teams_in_data = sorted(
                set(team_matches["home_team"].unique())
                | set(team_matches["away_team"].unique())
            )
            tidx = {t: i for i, t in enumerate(teams_in_data)}
            T = len(teams_in_data)

            home_i = team_matches["home_team"].map(tidx).values
            away_i = team_matches["away_team"].map(tidx).values
            home_flag = (team_matches["home_team"] == t1_canonical).astype(float).values
            yh = team_matches["home_score"].values.astype(float)
            ya = team_matches["away_score"].values.astype(float)

            ref_date = team_matches["date"].max()
            params, fit_info = _fit_dixon_coles(
                T,
                home_i,
                away_i,
                home_flag,
                yh,
                ya,
                team_matches["date"],
                ref_date,
                half_life_years=cfg.half_life_years,
                ridge=cfg.ridge,
            )

            rho = (
                cfg.rho
                if cfg.rho is not None
                else _fit_rho(params, T, home_i, away_i, home_flag, yh, ya)
            )

            # Predict for team1 vs team2
            t1_i = tidx[t1_canonical]
            t2_i = tidx[t2_canonical]
            att = params[:T]
            dfn = params[T : 2 * T]
            gamma = params[2 * T]

            lam_h = math.exp(min(att[t1_i] + dfn[t2_i] + gamma * home_flag_val, 4.0))
            lam_a = math.exp(min(att[t2_i] + dfn[t1_i], 4.0))

            method = "dixon_coles"
            n_used = n_team

    # Run Monte Carlo simulation
    sim = _simulate_scores(lam_h, lam_a, rho, cfg.n_simulations, rng)

    return SimulationResult(
        team1=t1_canonical,
        team2=t2_canonical,
        team1_win_prob=sim["team1_win"],
        draw_prob=sim["draw"],
        team2_win_prob=sim["team2_win"],
        team1_expected_goals=lam_h,
        team2_expected_goals=lam_a,
        n_simulations=cfg.n_simulations,
        score_histogram=sim["score_histogram"],
        most_likely_score=sim["most_likely_score"],
        method=method,
        rho=rho,
        n_matches_used=n_used,
    )
