"""Tests for GET /tournament/{tournament_name}/matches endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _KNOWN_TOURNAMENT, _assert_keys, _assert_status


class TestTournamentMatches:
    def test_matches_known(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}/matches?limit=5")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(
            body,
            {"tournament", "total", "limit", "offset", "matches"},
            "tournament.matches",
        )
        assert body["limit"] == 5
        assert body["offset"] == 0
        assert 0 < len(body["matches"]) <= 5
        _assert_keys(
            body["matches"][0],
            {
                "date",
                "home_team",
                "away_team",
                "home_score",
                "away_score",
                "city",
                "country",
                "neutral",
                "tournament",
            },
            "tournament.matches[0]",
        )

    def test_matches_newest_first(self, client: TestClient):
        matches = client.get(
            f"/tournament/{_KNOWN_TOURNAMENT}/matches?limit=10"
        ).json()["matches"]
        dates = [m["date"] for m in matches]
        assert dates == sorted(dates, reverse=True)

    def test_matches_pagination(self, client: TestClient):
        first = client.get(
            f"/tournament/{_KNOWN_TOURNAMENT}/matches?limit=2&offset=0"
        ).json()
        second = client.get(
            f"/tournament/{_KNOWN_TOURNAMENT}/matches?limit=2&offset=2"
        ).json()
        assert first["total"] == second["total"]
        assert [m["date"] for m in first["matches"]] != [
            m["date"] for m in second["matches"]
        ]

    def test_matches_year_filter(self, client: TestClient):
        yearly = client.get(f"/tournament/{_KNOWN_TOURNAMENT}").json()["yearly"]
        year = yearly[0]["year"]
        body = client.get(
            f"/tournament/{_KNOWN_TOURNAMENT}/matches?year={year}&limit=200"
        ).json()
        assert body["total"] > 0
        assert all(m["date"].startswith(str(year)) for m in body["matches"])

    def test_matches_unknown_tournament(self, client: TestClient):
        resp = client.get("/tournament/NonExistentTournamentXXX/matches")
        _assert_status(resp, 200)
        assert resp.json().get("error") is True

    def test_matches_rejects_out_of_range_limit(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}/matches?limit=0")
        assert resp.status_code == 422
