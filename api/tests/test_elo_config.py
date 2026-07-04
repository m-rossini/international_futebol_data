"""Unit tests for ELO configuration: tournament weights, goal-difference multiplier, and loader."""

import math

import pytest

from stats.elo_config import EloConfig, goal_difference_multiplier, load_elo_config


# ── _normalize ─────────────────────────────────────────────────────────


class TestNormalize:
    """The internal _normalize helper lowercases, strips, and collapses whitespace."""

    def test_basic(self):
        from stats.elo_config import _normalize

        assert _normalize("FIFA World Cup") == "fifa world cup"

    def test_extra_whitespace(self):
        from stats.elo_config import _normalize

        assert _normalize("  FIFA   World   Cup  ") == "fifa world cup"

    def test_already_lower(self):
        from stats.elo_config import _normalize

        assert _normalize("friendly") == "friendly"

    def test_empty(self):
        from stats.elo_config import _normalize

        assert _normalize("") == ""


# ── goal_difference_multiplier ────────────────────────────────────────


class TestGoalDifferenceMultiplier:
    """Official ELO GD multiplier: min(ln(|GD| + 1), cap)."""

    def test_1_goal(self):
        assert goal_difference_multiplier(1, cap=2.0) == pytest.approx(math.log(2))

    def test_2_goals(self):
        assert goal_difference_multiplier(2, cap=2.0) == pytest.approx(math.log(3))

    def test_3_goals(self):
        assert goal_difference_multiplier(3, cap=2.0) == pytest.approx(math.log(4))

    def test_5_goals(self):
        assert goal_difference_multiplier(5, cap=2.0) == pytest.approx(math.log(6))

    def test_negative_diff(self):
        assert goal_difference_multiplier(-1, cap=2.0) == pytest.approx(math.log(2))

    def test_zero_diff(self):
        assert goal_difference_multiplier(0, cap=2.0) == pytest.approx(math.log(1))

    def test_cap_applies(self):
        # ln(1000 + 1) ≈ 6.9, capped at 2.0
        assert goal_difference_multiplier(1000, cap=2.0) == 2.0

    def test_custom_cap(self):
        assert goal_difference_multiplier(5, cap=1.5) == 1.5

    def test_no_cap_needed(self):
        assert goal_difference_multiplier(1, cap=10.0) == pytest.approx(math.log(2))


# ── EloConfig.get_tournament_weight ───────────────────────────────────


class TestGetTournamentWeight:
    """Tournament weight lookup with normalised keys and wildcard fallback."""

    def _make_config(self, weights=None, default=0.33):
        if weights is None:
            weights = {}
        # Pre-normalise keys the same way load_elo_config does
        normalised = {}
        import re

        for k, v in weights.items():
            normalised[re.sub(r"\s+", " ", k.strip().lower())] = v
        return EloConfig(tournament_weights=normalised, _default_weight=default)

    def test_exact_match(self):
        cfg = self._make_config({"FIFA World Cup": 1.0, "Friendly": 0.17})
        assert cfg.get_tournament_weight("FIFA World Cup") == 1.0

    def test_case_insensitive(self):
        cfg = self._make_config({"FIFA World Cup": 1.0})
        assert cfg.get_tournament_weight("fifa world cup") == 1.0

    def test_whitespace_tolerance(self):
        cfg = self._make_config({"FIFA World Cup": 1.0})
        assert cfg.get_tournament_weight("  FIFA   World   Cup  ") == 1.0

    def test_wildcard_fallback(self):
        cfg = self._make_config({"Friendly": 0.17, "*": 0.33})
        assert cfg.get_tournament_weight("Some Random Tournament") == 0.33

    def test_default_when_no_wildcard(self):
        cfg = self._make_config({"Friendly": 0.17})
        cfg._default_weight = 0.1
        assert cfg.get_tournament_weight("Unknown") == 0.1


# ── load_elo_config ───────────────────────────────────────────────────


class TestLoadEloConfig:
    """Builds EloConfig from the 'elo' section of config.json."""

    def test_full_config(self):
        raw = {
            "elo": {
                "k_factor": 50,
                "home_advantage": 80,
                "initial_elo": 1400,
                "tournament_weights": {
                    "FIFA World Cup": 1.0,
                    "Friendly": 0.17,
                    "*": 0.33,
                },
                "goal_difference": {"enabled": False, "cap": 3.0},
            }
        }
        cfg = load_elo_config(raw)
        assert cfg.k_factor == 50
        assert cfg.home_advantage == 80
        assert cfg.initial_elo == 1400
        assert cfg.gd_enabled is False
        assert cfg.gd_cap == 3.0
        # Tournament weight uses normalised key
        assert cfg.get_tournament_weight("FIFA World Cup") == 1.0
        assert cfg.get_tournament_weight("Friendly") == 0.17
        assert cfg.get_tournament_weight("Some Other Cup") == 0.33

    def test_empty_config(self):
        cfg = load_elo_config({})
        assert cfg.k_factor == 60
        assert cfg.home_advantage == 100
        assert cfg.initial_elo == 1500
        assert cfg.gd_enabled is True
        assert cfg.gd_cap == 2.0

    def test_missing_elo_section(self):
        cfg = load_elo_config({"server": {"host": "0.0.0.0"}})
        assert cfg.k_factor == 60

    def test_partial_config(self):
        raw = {"elo": {"k_factor": 40}}
        cfg = load_elo_config(raw)
        assert cfg.k_factor == 40
        assert cfg.home_advantage == 100  # default
        assert cfg.gd_enabled is True  # default


# ── EloConfig.to_dict ─────────────────────────────────────────────────


class TestEloConfigToDict:
    """Serialisation for cache-key hashing."""

    def test_roundtrip(self):
        raw = {
            "elo": {
                "k_factor": 45,
                "tournament_weights": {"FIFA World Cup": 1.0, "*": 0.33},
                "goal_difference": {"enabled": True, "cap": 2.5},
            }
        }
        cfg = load_elo_config(raw)
        d = cfg.to_dict()
        assert d["k_factor"] == 45
        assert d["gd_cap"] == 2.5
        assert "tournament_weights" in d

    def test_empty_config_roundtrip(self):
        cfg = load_elo_config({})
        d = cfg.to_dict()
        assert d["k_factor"] == 60
        assert d["gd_enabled"] is True
