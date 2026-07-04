"""ELO rating calculation from historical match results.

Uses the standard ELO formula:
    new_elo = old_elo + K * weight * gd_mult * (actual_result - expected_result)

Where:
    - K (factor): configurable, default 60
    - weight: tournament importance multiplier (0–1)
    - gd_mult: goal-difference multiplier  min(ln(|GD|+1), cap)
    - expected = 1 / (1 + 10^((elo_opponent - elo_team) / 400))
    - actual: 1.0 (win), 0.5 (draw), 0.0 (loss)
    - Home advantage: configurable, default +100 ELO points
    - Neutral venue: no adjustment

Includes disk caching via pickle to avoid recalculating on every reload.
"""

import hashlib
import json
import os

import pandas as pd

from .elo_config import EloConfig, goal_difference_multiplier
from .filters import FilterParams, apply_filters
from .log import get_logger

logger = get_logger("elo")

# Initial ELO rating for new teams
INITIAL_ELO = 1500.0

# K-factor for international matches
K_FACTOR = 60

# Home advantage bonus
HOME_ADVANTAGE = 100

# Cache file paths (relative to the data directory)
ELO_CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "data")
ELO_CACHE_FILE = os.path.join(ELO_CACHE_DIR, "elo_ratings.pkl")
ELO_HASH_FILE = os.path.join(ELO_CACHE_DIR, "elo_matches_hash.txt")


def _matches_hash(matches: pd.DataFrame, elo_config: EloConfig | None = None) -> str:
    """Compute a hash of the matches dataframe + ELO config to detect changes."""
    # Use the number of rows + the date of the last match + the total goals
    match_key = f"{len(matches)}_{matches['date'].max()}_{matches['home_score'].sum()}_{matches['away_score'].sum()}"
    config_key = json.dumps(elo_config.to_dict(), sort_keys=True) if elo_config else ""
    key = f"{match_key}_{config_key}"
    return hashlib.md5(key.encode()).hexdigest()


def _load_elo_cache(
    matches: pd.DataFrame, elo_config: EloConfig | None = None
) -> pd.DataFrame | None:
    """Try to load cached ELO ratings from disk. Returns None if cache is stale or missing."""
    if not os.path.exists(ELO_CACHE_FILE) or not os.path.exists(ELO_HASH_FILE):
        logger.info("No ELO cache found on disk — will calculate fresh.")
        return None

    with open(ELO_HASH_FILE) as f:
        cached_hash = f.read().strip()

    current_hash = _matches_hash(matches, elo_config)
    if cached_hash != current_hash:
        logger.info(
            "ELO cache is stale (match data or config changed) — recalculating."
        )
        return None

    try:
        df = pd.read_pickle(ELO_CACHE_FILE)
        logger.info("Loaded ELO ratings from cache: %d rows", len(df))
        return df
    except Exception as exc:
        logger.warning("Failed to read ELO cache: %s — recalculating.", exc)
        return None


def clear_elo_cache() -> bool:
    """Delete the ELO cache files from disk. Returns True if anything was removed."""
    removed = False
    for path in (ELO_CACHE_FILE, ELO_HASH_FILE):
        if os.path.exists(path):
            os.remove(path)
            removed = True
            logger.info("Removed ELO cache file: %s", path)
    if not removed:
        logger.info("No ELO cache files to remove.")
    return removed


def _save_elo_cache(
    df: pd.DataFrame, matches: pd.DataFrame, elo_config: EloConfig | None = None
) -> None:
    """Save ELO ratings to disk cache."""
    try:
        os.makedirs(ELO_CACHE_DIR, exist_ok=True)
        df.to_pickle(ELO_CACHE_FILE)
        with open(ELO_HASH_FILE, "w") as f:
            f.write(_matches_hash(matches, elo_config))
        logger.info("ELO ratings cached to disk (%d rows).", len(df))
    except Exception as exc:
        logger.warning("Failed to write ELO cache: %s", exc)


def _expected_score(rating_a: float, rating_b: float) -> float:
    """Probability that team A beats team B."""
    return 1.0 / (1.0 + 10.0 ** ((rating_b - rating_a) / 400.0))


def _get_actual_result(home_score: int, away_score: int) -> float:
    """Convert scoreline to actual result from home team perspective."""
    if home_score > away_score:
        return 1.0
    elif home_score == away_score:
        return 0.5
    return 0.0


def calculate_elo_ratings(
    matches: pd.DataFrame,
    elo_config: EloConfig | None = None,
    initial_elo: float = INITIAL_ELO,
    k_factor: float = K_FACTOR,
    home_advantage: float = HOME_ADVANTAGE,
) -> pd.DataFrame:
    """Calculate historical ELO ratings from match results.

    Parameters
    ----------
    matches : pd.DataFrame
        Must have columns: date, home_team, away_team, home_score, away_score,
        tournament, neutral.
    elo_config : EloConfig, optional
        Full ELO configuration.  When provided, its values override the
        individual ``initial_elo``, ``k_factor``, and ``home_advantage``
        parameters.
    initial_elo : float
        Starting ELO for all teams (default: 1500).
    k_factor : float
        K-factor for rating adjustment (default: 60).
    home_advantage : float
        Extra ELO points for home team (default: 100).

    Returns
    -------
    pd.DataFrame
        Columns: date, team, elo_rating, opponent, opponent_elo,
        home_score, away_score, tournament, home_advantage_applied,
        expected_score, actual_result, rating_change, match_weight,
        gd_multiplier
    """
    # Apply config overrides
    if elo_config is not None:
        initial_elo = elo_config.initial_elo
        k_factor = elo_config.k_factor
        home_advantage = elo_config.home_advantage

    if matches.empty:
        logger.warning("No matches provided for ELO calculation.")
        return pd.DataFrame()

    # Try loading from cache first
    cached = _load_elo_cache(matches, elo_config)
    if cached is not None:
        return cached

    # Sort chronologically
    matches = matches.sort_values("date").reset_index(drop=True)

    # Track ELO for each team
    elo_dict: dict[str, float] = {}

    records = []

    total = len(matches)
    skipped_nan = 0
    for idx, row in matches.iterrows():
        home = row["home_team"]
        away = row["away_team"]

        # Skip rows with NaN scores (abandoned/cancelled matches)
        if pd.isna(row["home_score"]) or pd.isna(row["away_score"]):
            skipped_nan += 1
            continue

        home_score = int(row["home_score"])
        away_score = int(row["away_score"])
        tournament = row.get("tournament", "")
        match_date = row["date"]

        # Initialize teams if not seen before
        if home not in elo_dict:
            elo_dict[home] = initial_elo
        if away not in elo_dict:
            elo_dict[away] = initial_elo

        # Determine if neutral venue (tournaments like World Cup, continental cups)
        # Neutral if specified as neutral in data OR specific tournament types
        is_neutral = False
        if "neutral" in row.index and row["neutral"]:
            is_neutral = True

        home_elo_effective = elo_dict[home]
        away_elo_effective = elo_dict[away]

        home_adv_applied = 0.0
        if not is_neutral:
            home_elo_effective += home_advantage
            home_adv_applied = home_advantage

        # Expected score for home team
        expected_home = _expected_score(home_elo_effective, away_elo_effective)
        actual_home = _get_actual_result(home_score, away_score)

        # Tournament weight and goal-difference multiplier
        match_weight = (
            elo_config.get_tournament_weight(tournament) if elo_config else 1.0
        )
        if elo_config and elo_config.gd_enabled:
            gd_mult = goal_difference_multiplier(
                home_score - away_score, elo_config.gd_cap
            )
        else:
            gd_mult = 1.0

        # ELO change
        elo_change = k_factor * match_weight * gd_mult * (actual_home - expected_home)

        # Update ratings (use the *effective* home ELO for the formula but apply
        # the change to the *base* rating)
        old_home = elo_dict[home]
        old_away = elo_dict[away]

        elo_dict[home] += elo_change
        elo_dict[away] -= elo_change  # opponent's change is symmetric

        records.append(
            {
                "date": match_date,
                "team": home,
                "opponent": away,
                "elo_rating": old_home,
                "elo_rating_new": elo_dict[home],
                "opponent_elo": old_away,
                "opponent_elo_new": elo_dict[away],
                "home_score": home_score,
                "away_score": away_score,
                "tournament": tournament,
                "is_neutral": is_neutral,
                "home_advantage_applied": home_adv_applied,
                "expected_score": round(expected_home, 4),
                "actual_result": actual_home,
                "rating_change": round(elo_change, 2),
                "match_weight": round(match_weight, 4),
                "gd_multiplier": round(gd_mult, 4),
            }
        )

        if (idx + 1) % 10000 == 0:
            logger.info("ELO calculation: %d / %d matches processed", idx + 1, total)

    result = pd.DataFrame(records)
    logger.info(
        "ELO calculation complete: %d matches, %d unique teams, "
        "%d skipped (NaN scores), ratings range [%.0f, %.0f]",
        len(result),
        len(elo_dict),
        skipped_nan,
        min(elo_dict.values()),
        max(elo_dict.values()),
    )

    # Save to disk cache for faster reloads
    _save_elo_cache(result, matches, elo_config)

    return result


def calculate_elo_for_filters(
    matches: pd.DataFrame,
    filters: FilterParams | None,
    elo_config: EloConfig | None = None,
) -> pd.DataFrame | None:
    """Calculate ELO ratings on a filtered subset of matches.

    Parameters
    ----------
    matches : pd.DataFrame
        Full historical match results.
    filters : FilterParams, optional
        Filters to apply before ELO calculation.  When ``None`` or empty,
        returns ``None`` so the caller can fall back to the pre-computed
        ``state.elo_ratings``.
    elo_config : EloConfig, optional
        ELO configuration (K-factor, tournament weights, etc.).

    Returns
    -------
    pd.DataFrame or None
        ELO ratings computed on the filtered subset, or ``None`` when no
        filters are active.
    """
    if filters is None or filters.is_empty:
        return None

    filtered = apply_filters(matches, filters)
    if filtered.empty:
        return pd.DataFrame()

    return calculate_elo_ratings(filtered, elo_config=elo_config)


def get_latest_elo(elo_history: pd.DataFrame, top_n: int = 50) -> pd.DataFrame:
    """Get the latest ELO rating for each team.

    Parameters
    ----------
    elo_history : pd.DataFrame
        Output from ``calculate_elo_ratings``.
    top_n : int
        Number of top teams to return.

    Returns
    -------
    pd.DataFrame
        Columns: team, elo_rating, date, opponent, ranking.
    """
    if elo_history.empty:
        return pd.DataFrame()

    # For each team, get the latest row (by date)
    latest_idx = elo_history.groupby("team")["date"].idxmax()
    latest = elo_history.loc[latest_idx, ["team", "elo_rating_new", "date"]].copy()
    latest = latest.rename(columns={"elo_rating_new": "elo_rating"})
    latest = latest.sort_values("elo_rating", ascending=False).reset_index(drop=True)
    latest.index = latest.index + 1  # 1-based ranking
    latest["ranking"] = latest.index

    return latest.head(top_n)


def get_decade_leaders(
    elo_history: pd.DataFrame,
    decades: list[str] | None = None,
    top_n: int = 5,
) -> list[dict]:
    """Get top teams by average ELO rating for each decade.

    Parameters
    ----------
    elo_history : pd.DataFrame
        Output from ``calculate_elo_ratings``.
    decades : list[str] | None
        List of decade labels (e.g. '1990s', '2000s'). Auto-detected if None.
    top_n : int
        Number of top teams per decade.

    Returns
    -------
    list[dict]
        Each dict: {decade, year_range, teams: [{team, avg_elo, peak_elo, match_count}]}
    """
    if elo_history.empty:
        return []

    # Extract decade from date
    df = elo_history.copy()
    df["year"] = pd.to_datetime(df["date"]).dt.year
    df["decade"] = (df["year"] // 10 * 10).astype(str) + "s"

    # Filter to requested decades or auto-detect
    if decades:
        df = df[df["decade"].isin(decades)]
    else:
        # Filter to decades with enough data
        dec_counts = df.groupby("decade")["team"].nunique()
        decades_with_data = dec_counts[dec_counts >= 10].index.tolist()
        df = df[df["decade"].isin(decades_with_data)]

    results = []
    for decade, grp in sorted(df.groupby("decade")):
        # Average ELO per team in this decade
        team_stats = (
            grp.groupby("team")
            .agg(
                avg_elo=("elo_rating_new", "mean"),
                peak_elo=("elo_rating_new", "max"),
                match_count=("date", "count"),
            )
            .reset_index()
        )

        team_stats = team_stats.sort_values("avg_elo", ascending=False).head(top_n)

        year_start = int(decade.replace("s", ""))
        year_end = year_start + 9

        results.append(
            {
                "decade": decade,
                "year_range": f"{year_start}–{year_end}",
                "leader": {
                    "team": team_stats.iloc[0]["team"],
                    "avg_elo": round(team_stats.iloc[0]["avg_elo"], 1),
                    "peak_elo": round(team_stats.iloc[0]["peak_elo"], 1),
                    "match_count": int(team_stats.iloc[0]["match_count"]),
                },
                "teams": [
                    {
                        "team": row["team"],
                        "avg_elo": round(row["avg_elo"], 1),
                        "peak_elo": round(row["peak_elo"], 1),
                        "match_count": int(row["match_count"]),
                    }
                    for _, row in team_stats.iterrows()
                ],
            }
        )

    return results


def get_elo_by_date(elo_history: pd.DataFrame, target_date: str) -> pd.DataFrame:
    """Get all ELO rows for a specific date.

    Returns every team that played a match on ``target_date``, with their
    post-match ELO rating. If no matches occurred that day, returns an
    empty DataFrame.

    Parameters
    ----------
    elo_history : pd.DataFrame
        Output from ``calculate_elo_ratings``.
    target_date : str
        Date in ``YYYY-MM-DD`` format.

    Returns
    -------
    pd.DataFrame
        Rows matching that exact date, sorted by elo_rating_new descending.
    """
    if elo_history.empty:
        return pd.DataFrame()

    df = elo_history[
        elo_history["date"].dt.date == pd.Timestamp(target_date).date()
    ].copy()
    if df.empty:
        return df

    return df.sort_values("elo_rating_new", ascending=False).reset_index(drop=True)


def get_team_elo_history(elo_history: pd.DataFrame, team: str) -> pd.DataFrame:
    """Get ELO history for a specific team.

    Parameters
    ----------
    elo_history : pd.DataFrame
        Output from ``calculate_elo_ratings``.
    team : str
        Team name.

    Returns
    -------
    pd.DataFrame
        Filtered history sorted by date.
    """
    mask = elo_history["team"].str.lower() == team.lower()
    team_df = elo_history[mask].copy()
    if team_df.empty:
        return team_df
    return team_df.sort_values("date")


def enrich_history_with_ranking(elo_history: pd.DataFrame, team: str) -> pd.DataFrame:
    """Add ranking position to a team's ELO history.

    For each unique date, computes the team's rank based on each team's
    latest ELO up to that date. Uses O(n) scan with incremental tracking.

    Parameters
    ----------
    elo_history : pd.DataFrame
        Full ELO history (output from ``calculate_elo_ratings``).
    team : str
        Team name.

    Returns
    -------
    pd.DataFrame
        Team history with ``ranking`` column added, sorted by date.
    """
    team_df = get_team_elo_history(elo_history, team)
    if team_df.empty:
        return team_df

    sorted_df = elo_history.sort_values("date")
    grouped = sorted_df.groupby("date", sort=True)

    latest_elo: dict[str, float] = {}
    ranking_by_date: dict[str, int] = {}

    for date, group in grouped:
        for _, row in group.iterrows():
            latest_elo[row["team"]] = row["elo_rating_new"]
        if team in latest_elo:
            team_elo = latest_elo[team]
            rank = sum(1 for e in latest_elo.values() if e > team_elo) + 1
            ranking_by_date[str(date)] = rank

    rankings = [ranking_by_date.get(str(d)) for d in team_df["date"]]

    team_df = team_df.copy()
    team_df["ranking"] = rankings
    return team_df
