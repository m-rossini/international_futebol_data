"""Tests for GET /biggest_wins endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _KNOWN_TOURNAMENT, _KNOWN_COUNTRY, _assert_keys, _assert_status


class TestBiggestWins:
    def test_biggest_wins_default(self, client: TestClient):
        resp = client.get("/biggest_wins")
        _assert_status(resp)
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 10  # default

    def test_biggest_wins_custom_n(self, client: TestClient):
        resp = client.get("/biggest_wins?top_n=3")
        _assert_status(resp)
        assert len(resp.json()) == 3

    def test_biggest_wins_shape(self, client: TestClient):
        resp = client.get("/biggest_wins?top_n=1")
        item = resp.json()[0]
        _assert_keys(item, {
            "date", "home_team", "away_team", "home_score", "away_score",
            "tournament", "city", "country", "rank", "goal_diff",
        }, "biggest_wins.item")

    def test_biggest_wins_types(self, client: TestClient):
        resp = client.get("/biggest_wins?top_n=1")
        item = resp.json()[0]
        assert isinstance(item["rank"], int)
        assert isinstance(item["goal_diff"], int)
        assert isinstance(item["home_score"], int)
        assert isinstance(item["away_score"], int)
        assert item["rank"] == 1
        assert item["goal_diff"] >= 0

    def test_biggest_wins_descending(self, client: TestClient):
        resp = client.get("/biggest_wins?top_n=5")
        data = resp.json()
        diffs = [d["goal_diff"] for d in data]
        for i in range(len(diffs) - 1):
            assert diffs[i] >= diffs[i + 1], (
                f"Not sorted descending: {diffs}"
            )

    # ------------------------------------------------------------------
    #  Filter tests
    # ------------------------------------------------------------------

    def test_filter_tournament_applies(self, client: TestClient):
        resp = client.get(f"/biggest_wins?top_n=200&tournaments={_KNOWN_TOURNAMENT}").json()
        assert len(resp) > 0
        for item in resp:
            assert item["tournament"] == _KNOWN_TOURNAMENT

    def test_filter_country_applies(self, client: TestClient):
        resp = client.get(f"/biggest_wins?top_n=200&countries={_KNOWN_COUNTRY}").json()
        assert len(resp) > 0
        for item in resp:
            assert item["country"] == _KNOWN_COUNTRY

    def test_filter_nonexistent_tournament_returns_empty(self, client: TestClient):
        resp = client.get("/biggest_wins?tournaments=NonExistentTournamentXYZ").json()
        assert resp == []

    def test_filter_date_from_after_date_to_returns_empty(self, client: TestClient):
        resp = client.get("/biggest_wins?date_from=2020-01-01&date_to=2010-01-01").json()
        assert resp == []
