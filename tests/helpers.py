"""Shared constants and assertion helpers for integration tests.

Import from this module in test files::

    from helpers import _KNOWN_TEAM, _assert_keys, _assert_status
"""

# ---------------------------------------------------------------------------
#  Known values for testing
# ---------------------------------------------------------------------------

_KNOWN_TEAM = "Brazil"
_KNOWN_TEAM_LOWER = "brazil"
_KNOWN_TEAM_MIXED = "bRaZiL"
_KNOWN_TEAM2 = "Argentina"
_KNOWN_TOURNAMENT = "FIFA World Cup"
_KNOWN_CITY = "London"
_KNOWN_CITY_LOWER = "london"
_KNOWN_COUNTRY = "France"
_KNOWN_COUNTRY_LOWER = "france"

# Accented names for accent-insensitivity tests
_ACCENTED_TEAM = "São Tomé and Príncipe"
_ACCENTED_TEAM_FLAT = "Sao Tome and Principe"


# ---------------------------------------------------------------------------
#  Assertion helpers
# ---------------------------------------------------------------------------

def _assert_status(data, status_code: int = 200):
    """Assert a response has the given status code."""
    assert data.status_code == status_code, (
        f"Expected {status_code}, got {data.status_code}: {data.text[:200]}"
    )


def _assert_keys(obj: dict, expected: set, label: str = "response"):
    """Assert that *at least* the expected keys are present."""
    actual = set(obj.keys())
    missing = expected - actual
    assert not missing, f"{label} missing keys: {missing}"


# Mapping from /most/{stat} stat name → actual key in the ranking response item
_STAT_TO_RESPONSE_KEY = {
    "wins": "wins",
    "losses": "losses",
    "draws": "draws",
    "win_rate": "win_rate",
    "loss_rate": "loss_rate",
    "goals_pro": "goals_for",
    "goals_against": "goals_against",
    "matches": "matches_played",
}


# Expected keys for any series_stats() response
_ADVANCED_STAT_KEYS = {
    "count", "sum", "mean", "median", "mode",
    "min", "max", "stdev", "variance", "skewness", "kurtosis",
    "p25", "p50", "p75", "iqr", "range",
}


def _assert_series_stats(stat_dict: dict, label: str, expect_nonzero: bool = True):
    """Validate a series_stats dict has all expected keys and correct types."""
    _assert_keys(stat_dict, _ADVANCED_STAT_KEYS, label)
    assert isinstance(stat_dict["count"], int), f"{label}.count should be int"
    if expect_nonzero and stat_dict["count"] > 0:
        assert isinstance(stat_dict["mean"], float), f"{label}.mean should be float"
        assert isinstance(stat_dict["median"], float), f"{label}.median should be float"
        assert isinstance(stat_dict["mode"], list), f"{label}.mode should be list"
        assert isinstance(stat_dict["stdev"], float), f"{label}.stdev should be float"
        assert isinstance(stat_dict["variance"], float), f"{label}.variance should be float"
        assert stat_dict["skewness"] is None or isinstance(stat_dict["skewness"], float), f"{label}.skewness wrong type"
        assert stat_dict["kurtosis"] is None or isinstance(stat_dict["kurtosis"], float), f"{label}.kurtosis wrong type"
        assert isinstance(stat_dict["p25"], float), f"{label}.p25 should be float"
        assert isinstance(stat_dict["p75"], float), f"{label}.p75 should be float"
        assert isinstance(stat_dict["iqr"], float), f"{label}.iqr should be float"
        assert isinstance(stat_dict["range"], int), f"{label}.range should be int"
