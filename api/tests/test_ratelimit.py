"""Tests for the in-process rate limiter."""

from football_stats.ratelimit import RateLimiter, group_for_path


def test_allows_burst_then_throttles():
    lim = RateLimiter({"api": {"rate": 5.0, "burst": 3, "window": 60.0}})
    allowed = [lim.allow("ip-a", "api")[0] for _ in range(3)]
    assert allowed == [True, True, True]
    allowed, retry = lim.allow("ip-a", "api")
    assert allowed is False
    assert retry > 0


def test_different_ips_are_independent():
    lim = RateLimiter({"api": {"rate": 5.0, "burst": 1, "window": 60.0}})
    assert lim.allow("ip-a", "api")[0] is True
    assert lim.allow("ip-a", "api")[0] is False
    # A different IP gets its own bucket.
    assert lim.allow("ip-b", "api")[0] is True


def test_different_groups_are_independent():
    lim = RateLimiter(
        {
            "api": {"rate": 5.0, "burst": 1, "window": 60.0},
            "expensive": {"rate": 6.0 / 60.0, "burst": 1, "window": 60.0},
        }
    )
    assert lim.allow("ip-a", "api")[0] is True
    assert lim.allow("ip-a", "expensive")[0] is True


def test_expensive_prefix_group():
    assert group_for_path("/simulate") == "expensive"
    assert group_for_path("/conversation") == "expensive"
    assert group_for_path("/team/Brazil") == "api"
    assert group_for_path("/tournament/World Cup") == "api"
    assert group_for_path("/teams") == "static"
    assert group_for_path("/") == "static"


def test_reset_clears_buckets():
    lim = RateLimiter({"api": {"rate": 5.0, "burst": 1, "window": 60.0}})
    lim.allow("ip-a", "api")
    assert lim.allow("ip-a", "api")[0] is False
    lim.reset(ip="ip-a")
    assert lim.allow("ip-a", "api")[0] is True
