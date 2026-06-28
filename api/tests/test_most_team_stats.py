"""Tests for GET /most/{stat} — team stats ranking."""

import pytest
from fastapi.testclient import TestClient

from tests.helpers import (
    _KNOWN_TOURNAMENT,
    _KNOWN_COUNTRY,
    _STAT_TO_RESPONSE_KEY,
    _assert_keys,
    _assert_status,
)

_TEAM_MOST_STATS = [
    "wins",
    "losses",
    "draws",
    "win_rate",
    "loss_rate",
    "goals_pro",
    "goals_against",
    "matches",
]


class TestMostTeamStats:
    @pytest.mark.parametrize("stat", _TEAM_MOST_STATS)
    def test_most_stat_exists(self, client: TestClient, stat: str):
        resp = client.get(f"/most/{stat}")
        _assert_status(resp)

    @pytest.mark.parametrize("stat", _TEAM_MOST_STATS)
    def test_most_stat_shape(self, client: TestClient, stat: str):
        resp = client.get(f"/most/{stat}")
        body = resp.json()
        _assert_keys(body, {"stat", "top_n", "ranking"}, f"most/{stat}")
        assert body["stat"] == stat

    @pytest.mark.parametrize("stat", _TEAM_MOST_STATS)
    def test_most_stat_ranking_is_list(self, client: TestClient, stat: str):
        resp = client.get(f"/most/{stat}")
        body = resp.json()
        assert isinstance(body["ranking"], list)
        assert len(body["ranking"]) > 0

    @pytest.mark.parametrize("stat", _TEAM_MOST_STATS)
    def test_most_stat_ranking_shape(self, client: TestClient, stat: str):
        resp = client.get(f"/most/{stat}")
        ranking = resp.json()["ranking"]
        item = ranking[0]
        assert "team" in item
        key = _STAT_TO_RESPONSE_KEY[stat]
        assert key in item

    @pytest.mark.parametrize("stat", _TEAM_MOST_STATS)
    def test_most_stat_types(self, client: TestClient, stat: str):
        resp = client.get(f"/most/{stat}")
        item = resp.json()["ranking"][0]
        assert isinstance(item["team"], str)
        key = _STAT_TO_RESPONSE_KEY[stat]
        val = item.get(key)
        assert val is not None, f"Missing key '{key}' in response for stat '{stat}'"
        if stat in ("win_rate", "loss_rate"):
            assert isinstance(val, (int, float))
        else:
            assert isinstance(val, int)

    @pytest.mark.parametrize("stat", _TEAM_MOST_STATS)
    def test_most_stat_descending(self, client: TestClient, stat: str):
        """Team stats should be sorted descending by the stat value."""
        resp = client.get(f"/most/{stat}")
        ranking = resp.json()["ranking"]
        key = _STAT_TO_RESPONSE_KEY[stat]
        values = [r[key] for r in ranking]
        for i in range(len(values) - 1):
            assert values[i] >= values[i + 1], (
                f"Not sorted descending for {stat}: {values}"
            )

    @pytest.mark.parametrize("stat", _TEAM_MOST_STATS)
    def test_most_stat_respects_top_n(self, client: TestClient, stat: str):
        resp = client.get(f"/most/{stat}?top_n=3")
        body = resp.json()
        assert body["top_n"] == 3
        assert len(body["ranking"]) == 3

    # ------------------------------------------------------------------
    #  Filter tests (use representative stat "wins")
    # ------------------------------------------------------------------

    def test_filter_tournament_reduces_ranking(self, client: TestClient):
        full = client.get("/most/wins").json()
        filt = client.get(f"/most/wins?tournaments={_KNOWN_TOURNAMENT}").json()
        assert len(filt["ranking"]) > 0
        # Filtered ranking may be different (not necessarily a strict subset)
        # but the total value for top team should be lower
        assert filt["ranking"][0]["wins"] <= full["ranking"][0]["wins"]

    def test_filter_country_reduces_results(self, client: TestClient):
        filt = client.get(f"/most/wins?countries={_KNOWN_COUNTRY}").json()
        assert len(filt["ranking"]) > 0

    def test_filter_date_range(self, client: TestClient):
        resp = client.get("/most/wins?date_from=2000-01-01&date_to=2020-12-31").json()
        assert len(resp["ranking"]) > 0

    def test_filter_nonexistent_tournament_returns_empty(self, client: TestClient):
        resp = client.get("/most/wins?tournaments=NonExistentTournamentXYZ").json()
        assert resp["ranking"] == []

    def test_filter_date_from_after_date_to_returns_empty(self, client: TestClient):
        resp = client.get("/most/wins?date_from=2020-01-01&date_to=2010-01-01").json()
        assert resp["ranking"] == []
