"""ELO rating calculation from historical match results.

Uses the standard ELO formula:
    new_elo = old_elo + K * (actual_result - expected_result)

Where:
    - K (factor): 60 for international matches
    - expected = 1 / (1 + 10^((elo_opponent - elo_team) / 400))
    - actual: 1.0 (win), 0.5 (draw), 0.0 (loss)
    - Home advantage: +100 ELO points added to the home team
    - Neutral venue: no adjustment

Includes disk caching via pickle to avoid recalculating on every reload.
"""

import hashlib
import os

import pandas as pd
import numpy as np

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


def _matches_hash(matches: pd.DataFrame) -> str:
    """Compute a hash of the matches dataframe to detect changes."""
    # Use the number of rows + the date of the last match + the total goals
    key = f"{len(matches)}_{matches['date'].max()}_{matches['home_score'].sum()}_{matches['away_score'].sum()}"
    return hashlib.md5(key.encode()).hexdigest()


def _load_elo_cache(matches: pd.DataFrame) -> pd.DataFrame | None:
    """Try to load cached ELO ratings from disk. Returns None if cache is stale or missing."""
    if not os.path.exists(ELO_CACHE_FILE) or not os.path.exists(ELO_HASH_FILE):
        logger.info("No ELO cache found on disk — will calculate fresh.")
        return None

    with open(ELO_HASH_FILE) as f:
        cached_hash = f.read().strip()

    current_hash = _matches_hash(matches)
    if cached_hash != current_hash:
        logger.info("ELO cache is stale (match data changed) — recalculating.")
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


def _save_elo_cache(df: pd.DataFrame, matches: pd.DataFrame) -> None:
    """Save ELO ratings to disk cache."""
    try:
        os.makedirs(ELO_CACHE_DIR, exist_ok=True)
        df.to_pickle(ELO_CACHE_FILE)
        with open(ELO_HASH_FILE, "w") as f:
            f.write(_matches_hash(matches))
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
    initial_elo: float = INITIAL_ELO,
    k_factor: float = K_FACTOR,
    home_advantage: float = HOME_ADVANTAGE,
) -> pd.DataFrame:
    """Calculate historical ELO ratings from match results.

    Parameters
    ----------
    matches : pd.DataFrame
        Must have columns: date, home_team, away_team, home_score, away_score,
        tournament (to detect neutral venue).
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
        expected_score, actual_result, rating_change
    """
    if matches.empty:
        logger.warning("No matches provided for ELO calculation.")
        return pd.DataFrame()

    # Try loading from cache first
    cached = _load_elo_cache(matches)
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

        # ELO change
        elo_change = k_factor * (actual_home - expected_home)

        # Update ratings (use the *effective* home ELO for the formula but apply
        # the change to the *base* rating)
        old_home = elo_dict[home]
        old_away = elo_dict[away]

        elo_dict[home] += elo_change
        elo_dict[away] -= elo_change  # opponent's change is symmetric

        records.append({
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
        })

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
    _save_elo_cache(result, matches)

    return result


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


def get_team_elo_history(
    elo_history: pd.DataFrame, team: str
) -> pd.DataFrame:
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
    mask = (elo_history["team"].str.lower() == team.lower())
    team_df = elo_history[mask].copy()
    if team_df.empty:
        return team_df
    return team_df.sort_values("date")
