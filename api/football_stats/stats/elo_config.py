"""ELO configuration: tournament weights, goal-difference multiplier, and defaults.

Loaded from the ``elo`` section of ``config.json``.  Falls back to hard-coded
defaults when the section (or individual keys) is missing so that behaviour
before this module was introduced is preserved exactly.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field

from .log import get_logger

logger = get_logger("elo_config")

# ── Defaults (match the pre-config constants in elo.py) ────────────────
_DEFAULT_K_FACTOR = 60.0
_DEFAULT_HOME_ADVANTAGE = 100.0
_DEFAULT_INITIAL_ELO = 1500.0
_DEFAULT_GD_CAP = 2.0
_DEFAULT_TOURNAMENT_WEIGHT = 1.0  # K factors now encode tournament importance

# Default K factor per tournament type (match importance).
# World Cup > Continental > Qualifier > Other > Friendly.
_DEFAULT_TOURNAMENT_K_FACTORS = {
    "world_cup": 60.0,
    "continental": 50.0,
    "qualifier": 40.0,
    "other": 30.0,
    "friendly": 20.0,
}

# Keywords used to classify a tournament name into a type.
_CONTINENTAL_KEYWORDS = (
    "copa américa",
    "copa america",
    "african cup of nations",
    "afcon",
    "asian cup",
    "gold cup",
    "oceania nations cup",
    "confederations cup",
    "concacaf championship",
    "uefa euro",
    "africa cup of nations",
)


def _normalize(name: str) -> str:
    """Lower-case, strip, and collapse whitespace for typo-proof matching.

    ``"FIFA  World Cup "`` → ``"fifa world cup"``
    """
    return re.sub(r"\s+", " ", name.strip().lower())


def _classify_tournament(name: str) -> str:
    """Classify a tournament name into one of five ELO K-factor types.

    Returns one of: ``world_cup``, ``continental``, ``qualifier``,
    ``other``, ``friendly``.
    """
    key = _normalize(name)

    if "friendly" in key:
        return "friendly"
    if "world cup" in key and "qualification" not in key:
        return "world_cup"
    if "qualification" in key:
        return "qualifier"
    for kw in _CONTINENTAL_KEYWORDS:
        if kw in key:
            return "continental"
    return "other"


# ── Dataclass ──────────────────────────────────────────────────────────


@dataclass
class EloConfig:
    """All tuneable ELO parameters, derived from ``config.json``."""

    k_factor: float = _DEFAULT_K_FACTOR
    home_advantage: float = _DEFAULT_HOME_ADVANTAGE
    initial_elo: float = _DEFAULT_INITIAL_ELO

    # Pre-normalised tournament → weight mapping.
    # Keys are already run through ``_normalize()``.
    tournament_weights: dict[str, float] = field(default_factory=dict)
    _default_weight: float = _DEFAULT_TOURNAMENT_WEIGHT

    # Per-tournament-type K factors.  Keys are tournament *types* (as
    # returned by ``_classify_tournament``), not specific tournament names.
    tournament_k_factors: dict[str, float] = field(
        default_factory=lambda: dict(_DEFAULT_TOURNAMENT_K_FACTORS)
    )

    # Goal-difference settings
    gd_enabled: bool = True
    gd_cap: float = _DEFAULT_GD_CAP

    # ── Public helpers ──────────────────────────────────────────────────

    def get_tournament_weight(self, tournament: str) -> float:
        """Return the weight multiplier for *tournament*.

        Lookup order:
        1. Exact (normalised) match in ``tournament_weights``.
        2. The ``"*"`` wildcard entry.
        3. Hard-coded default (0.33).

        Logs a warning when neither an exact match nor the wildcard is found
        so that typos in the config surface during development.
        """
        key = _normalize(tournament)

        weight = self.tournament_weights.get(key)
        if weight is not None:
            return weight

        wildcard = self.tournament_weights.get("*")
        if wildcard is not None:
            return wildcard

        return self._default_weight

    def get_tournament_k(self, tournament: str) -> float:
        """Return the K factor for *tournament* based on its type.

        Looks up the tournament's type (see ``_classify_tournament``) and
        returns the corresponding K factor from ``tournament_k_factors``.
        Falls back to the flat ``k_factor`` if the type is not configured.
        """
        t_type = _classify_tournament(tournament)
        return self.tournament_k_factors.get(t_type, self.k_factor)

    def to_dict(self) -> dict:
        """Serialise to a plain dict (used for cache-key hashing)."""
        return {
            "k_factor": self.k_factor,
            "home_advantage": self.home_advantage,
            "initial_elo": self.initial_elo,
            "tournament_weights": dict(self.tournament_weights),
            "tournament_k_factors": dict(self.tournament_k_factors),
            "_default_weight": self._default_weight,
            "gd_enabled": self.gd_enabled,
            "gd_cap": self.gd_cap,
        }


# ── Goal-difference multiplier ─────────────────────────────────────────


def goal_difference_multiplier(goal_diff: int, cap: float) -> float:
    """Official ELO goal-difference multiplier: ``min(ln(|GD| + 1), cap)``.

    Examples::

        1-goal  → ln(2) ≈ 0.693
        2-goal  → ln(3) ≈ 1.099
        3-goal  → ln(4) ≈ 1.386
        5-goal  → ln(6) ≈ 1.792
       10-goal  → 2.0  (capped when cap=2.0)
    """
    return min(math.log(abs(goal_diff) + 1), cap)


# ── Loader ─────────────────────────────────────────────────────────────


def load_elo_config(config: dict) -> EloConfig:
    """Build an :class:`EloConfig` from the app-level *config* dict.

    Missing keys fall back to defaults so that an empty or partial ``elo``
    section never causes a crash.
    """
    elo_section = config.get("elo", {})
    if not elo_section:
        logger.debug("No 'elo' section in config — using all defaults.")
        return EloConfig()

    # Scalar settings
    k_factor = elo_section.get("k_factor", _DEFAULT_K_FACTOR)
    home_advantage = elo_section.get("home_advantage", _DEFAULT_HOME_ADVANTAGE)
    initial_elo = elo_section.get("initial_elo", _DEFAULT_INITIAL_ELO)

    # Tournament weights (normalise keys)
    raw_weights = elo_section.get("tournament_weights", {})
    tournament_weights: dict[str, float] = {}
    for name, weight in raw_weights.items():
        tournament_weights[_normalize(name)] = float(weight)

    default_weight = tournament_weights.pop("*", _DEFAULT_TOURNAMENT_WEIGHT)

    # Tournament K factors (normalise keys)
    raw_k_factors = elo_section.get("tournament_k_factors", {})
    tournament_k_factors: dict[str, float] = {}
    for name, k in raw_k_factors.items():
        tournament_k_factors[_normalize(name)] = float(k)

    # Goal-difference block
    gd_section = elo_section.get("goal_difference", {})
    gd_enabled = gd_section.get("enabled", True)
    gd_cap = gd_section.get("cap", _DEFAULT_GD_CAP)

    cfg = EloConfig(
        k_factor=k_factor,
        home_advantage=home_advantage,
        initial_elo=initial_elo,
        tournament_weights=tournament_weights,
        tournament_k_factors=tournament_k_factors,
        _default_weight=default_weight,
        gd_enabled=gd_enabled,
        gd_cap=gd_cap,
    )

    logger.info(
        "ELO config loaded: K=%.1f, HA=%.1f, initial=%.1f, "
        "GD enabled=%s (cap=%.1f), %d tournament weights",
        cfg.k_factor,
        cfg.home_advantage,
        cfg.initial_elo,
        cfg.gd_enabled,
        cfg.gd_cap,
        len(tournament_weights),
    )
    return cfg
