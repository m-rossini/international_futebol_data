"""Tests that the ELO disk cache is reserved for the full unfiltered history.

Regression cover for a bug where ``calculate_elo_for_filters`` ran the cached
code path, so any filtered request overwrote ``elo_ratings.pkl`` with its own
much smaller result. That evicted the full-history cache, forcing the next
unfiltered request to recalculate ~50k matches from scratch every time.
"""

import pandas as pd
import pytest

from football_stats.stats import elo as elo_mod
from football_stats.stats.elo import (
    _matches_hash,
    calculate_elo_for_filters,
    calculate_elo_ratings,
    clear_elo_cache,
)
from football_stats.stats.filters import FilterParams, apply_filters


@pytest.fixture
def matches():
    """Small synthetic match set, large enough that filtering actually narrows it."""
    rows = []
    for i in range(40):
        rows.append(
            {
                "date": pd.Timestamp("2020-01-01") + pd.Timedelta(days=i),
                "home_team": f"Home{i % 4}",
                "away_team": f"Away{i % 3}",
                "home_score": (i % 3) + 1,
                "away_score": (i % 2),
                "tournament": "World Cup" if i % 2 else "Friendly",
                "country": "Brazil" if i % 2 else "Argentina",
                "neutral": False,
            }
        )
    return pd.DataFrame(rows)


@pytest.fixture
def premodern_matches():
    """Matches spanning 1872-1950, mirroring the real dataset's long tail."""
    rows = []
    for i in range(40):
        rows.append(
            {
                "date": pd.Timestamp("1872-01-01") + pd.Timedelta(days=90 * i),
                "home_team": f"Home{i % 4}",
                "away_team": f"Away{i % 3}",
                "home_score": (i % 3) + 1,
                "away_score": (i % 2),
                "tournament": "World Cup" if i % 2 else "Friendly",
                "country": "Brazil" if i % 2 else "Argentina",
                "neutral": False,
            }
        )
    return pd.DataFrame(rows)


@pytest.fixture
def cache_hits(monkeypatch):
    """Records whether each disk-cache lookup was a hit (returned a frame).

    Lets a test assert the cache was actually *used*, not merely that the
    result came out right -- correctness alone would also pass if the value
    had simply been recomputed.
    """
    hits = []
    real = elo_mod._load_elo_cache

    def spy(matches, elo_config=None):
        result = real(matches, elo_config)
        hits.append(result is not None)
        return result

    monkeypatch.setattr(elo_mod, "_load_elo_cache", spy)
    return hits


@pytest.fixture(autouse=True)
def isolated_cache(tmp_path, monkeypatch):
    """Point the cache at a temp dir so tests never touch the real data/ dir."""
    cache_dir = tmp_path / "elo-cache"
    cache_dir.mkdir()
    monkeypatch.setattr(elo_mod, "ELO_CACHE_DIR", str(cache_dir))
    monkeypatch.setattr(elo_mod, "ELO_CACHE_FILE", str(cache_dir / "elo_ratings.pkl"))
    monkeypatch.setattr(
        elo_mod, "ELO_HASH_FILE", str(cache_dir / "elo_matches_hash.txt")
    )
    yield


def _cache_rows():
    return len(pd.read_pickle(elo_mod.ELO_CACHE_FILE))


class TestFilteredRunsDoNotEvictTheCache:
    def test_filtered_calculation_leaves_full_cache_intact(self, matches):
        # Warm the cache with the full history, as startup does.
        full = calculate_elo_ratings(matches)
        assert _cache_rows() == len(full)

        # Now a filtered request, as the rankings endpoint issues.
        filtered = calculate_elo_for_filters(
            matches, FilterParams(tournaments=["World Cup"])
        )
        assert filtered is not None
        assert len(filtered) < len(full)

        # The filtered run must not have replaced the full-history cache.
        assert _cache_rows() == len(full)

    def test_repeated_filtered_requests_never_touch_disk(self, matches):
        calculate_elo_ratings(matches)
        before = elo_mod.ELO_HASH_FILE
        hash_before = open(before).read()

        for _ in range(3):
            calculate_elo_for_filters(matches, FilterParams(tournaments=["World Cup"]))
            calculate_elo_for_filters(matches, FilterParams(countries=["Brazil"]))

        # Neither the data nor the validity hash changed.
        assert open(before).read() == hash_before

    def test_filtered_result_is_still_correct(self, matches):
        """Disabling the cache must not change the numbers, only the persistence."""
        cached = calculate_elo_for_filters(
            matches, FilterParams(tournaments=["World Cup"])
        )
        direct = calculate_elo_ratings(
            matches[matches["tournament"] == "World Cup"],
            use_disk_cache=False,
        )
        pd.testing.assert_frame_equal(cached, direct)


class TestFullHistoryStillCached:
    def test_full_history_is_cached_and_reused(self, matches):
        first = calculate_elo_ratings(matches)
        assert _cache_rows() == len(first)

        # A second call is served from disk, so it is a different object
        # instance than the freshly computed one.
        second = calculate_elo_ratings(matches)
        assert len(second) == len(first)
        pd.testing.assert_frame_equal(first, second)

    def test_config_change_invalidates_cache(self, matches):
        calculate_elo_ratings(matches)
        cached_hash = open(elo_mod.ELO_HASH_FILE).read()

        # A config change must produce a different validity hash.
        from football_stats.stats.elo_config import EloConfig

        assert _matches_hash(matches, EloConfig()) != cached_hash

    def test_no_op_filter_reuses_full_cache(self, matches):
        """A filter that removes nothing must not pay the full recalculation."""
        full = calculate_elo_ratings(matches)

        # A date range spanning every match narrows nothing.
        wide = FilterParams(date_from="1990-01-01", date_to="2030-01-01")
        result = calculate_elo_for_filters(matches, wide)

        assert result is not None
        assert len(result) == len(full)
        # Served from cache, so still the full-history cache on disk.
        assert _cache_rows() == len(full)

    def test_genuinely_narrowing_filter_never_reads_the_cache(
        self, matches, cache_hits
    ):
        """A filter that really does change the answer must not trust the cache."""
        calculate_elo_ratings(matches)
        assert cache_hits == [False]

        result = calculate_elo_for_filters(
            matches, FilterParams(tournaments=["World Cup"])
        )
        assert result is not None
        # No additional lookup at all -- the cache is bypassed entirely, so a
        # full-history pickle can never be mistaken for a filtered answer.
        assert cache_hits == [False]

    def test_date_filter_trimming_the_long_tail_is_not_a_noop(self, premodern_matches):
        """A filter that drops the oldest matches must recompute.

        The real dataset reaches back to 1872, so ``date_from=1900-01-01``
        returns fewer rows than the frame holds. That is a genuinely different
        ELO, so it must not be served from the full-history cache even though
        the user might consider the two "nearly the same".
        """
        calculate_elo_ratings(premodern_matches)
        cached_rows = _cache_rows()

        trimmed = apply_filters(
            premodern_matches,
            FilterParams(date_from="1950-01-01", date_to="2099-12-31"),
        )
        assert len(trimmed) < len(premodern_matches)

        result = calculate_elo_for_filters(
            premodern_matches,
            FilterParams(date_from="1950-01-01", date_to="2099-12-31"),
        )
        assert result is not None
        # Computed for the trimmed set, and the full-history cache is untouched.
        assert len(result) < cached_rows
        assert _cache_rows() == cached_rows

    def test_atomic_write_leaves_no_temp_files(self, matches):
        calculate_elo_ratings(matches)
        leftovers = [
            p for p in elo_mod.os.listdir(elo_mod.ELO_CACHE_DIR) if p.endswith(".tmp")
        ]
        assert leftovers == []


class TestClearCache:
    def test_clear_removes_both_files(self, matches):
        calculate_elo_ratings(matches)
        assert clear_elo_cache() is True
        import os

        assert not os.path.exists(elo_mod.ELO_CACHE_FILE)
        assert not os.path.exists(elo_mod.ELO_HASH_FILE)
