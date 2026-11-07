"""Tests for GET /players and GET /player/{name} endpoints."""

from fastapi.testclient import TestClient

from tests.helpers import _KNOWN_PLAYER, _assert_keys, _assert_status


class TestPlayers:
    def test_players_known(self, client: TestClient):
        resp = client.get("/players?limit=5")
        _assert_status(resp)
        body = resp.json()
        assert isinstance(body, list)
        assert 0 < len(body) <= 5
        _assert_keys(
            body[0],
            {
                "player_id",
                "name",
                "teams",
                "goals",
                "matches",
                "first_year",
                "last_year",
                "tournaments",
            },
            "players[0]",
        )

    def test_players_sorted_by_goals(self, client: TestClient):
        body = client.get("/players?limit=200").json()
        goals = [p["goals"] for p in body]
        assert goals == sorted(goals, reverse=True)

    def test_player_known(self, client: TestClient):
        resp = client.get(f"/player/{_KNOWN_PLAYER}")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(
            body,
            {"player_id", "name", "summary", "career", "tournaments", "top_teams"},
            "player",
        )
        assert body["name"] == _KNOWN_PLAYER
        assert body["summary"]["goals"] > 0
        assert body["summary"]["matches"] > 0

    def test_player_summary_keys(self, client: TestClient):
        s = client.get(f"/player/{_KNOWN_PLAYER}").json()["summary"]
        _assert_keys(
            s,
            {"teams", "goals", "matches", "first_year", "last_year", "tournaments"},
            "player.summary",
        )

    def test_player_career_shape(self, client: TestClient):
        career = client.get(f"/player/{_KNOWN_PLAYER}").json()["career"]
        assert len(career) > 0
        _assert_keys(
            career[0],
            {"year", "goals", "matches", "teams", "tournaments"},
            "player.career[0]",
        )

    def test_player_unknown(self, client: TestClient):
        resp = client.get("/player/NonExistentPlayerXYZ")
        _assert_status(resp, 200)
        assert resp.json().get("error") is True

    def test_player_filters(self, client: TestClient):
        # Filtering by a tournament Pelé played in should still return him.
        body = client.get(
            f"/player/{_KNOWN_PLAYER}?tournaments=FIFA%20World%20Cup"
        ).json()
        assert body.get("error") is not True
        assert body["name"] == _KNOWN_PLAYER

    def test_players_pagination(self, client: TestClient):
        first = client.get("/players?limit=2&offset=0").json()
        second = client.get("/players?limit=2&offset=2").json()
        assert len(first) == 2
        assert len(second) == 2
        assert [p["player_id"] for p in first] != [p["player_id"] for p in second]
