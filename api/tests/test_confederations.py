"""Tests for GET /confederations and /confederation/{name} endpoints."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status

_ALL = {"UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"}


class TestConfederationsList:
    def test_confederations_exists(self, client: TestClient):
        resp = client.get("/confederations")
        _assert_status(resp)
        data = resp.json()
        assert isinstance(data, list)
        assert {item["name"] for item in data} == _ALL

    def test_confederations_shape(self, client: TestClient):
        item = client.get("/confederations").json()[0]
        _assert_keys(item, {"name", "count", "countries"}, "confederations.item")
        assert isinstance(item["countries"], list)
        assert item["count"] == len(item["countries"])

    def test_confederations_member_counts(self, client: TestClient):
        counts = {i["name"]: i["count"] for i in client.get("/confederations").json()}
        assert counts["CONMEBOL"] == 10
        assert counts["UEFA"] == 55
        assert counts["CONCACAF"] == 41
        assert counts["CAF"] == 54
        assert counts["AFC"] == 47
        assert counts["OFC"] == 14

    def test_confederations_in_filter_options(self, client: TestClient):
        resp = client.get("/filters")
        _assert_status(resp)
        assert set(resp.json()["confederations"]) == _ALL


class TestConfederationDetail:
    def test_detail_shape(self, client: TestClient):
        resp = client.get("/confederation/CONMEBOL")
        _assert_status(resp)
        data = resp.json()
        _assert_keys(
            data,
            {
                "confederation",
                "countries",
                "teams",
                "total_matches",
                "total_goals",
                "unique_teams",
                "tournaments",
            },
            "confederation.detail",
        )
        assert data["confederation"] == "CONMEBOL"
        assert data["total_matches"] > 0
        assert data["unique_teams"] > 0
        assert set(data["countries"]) <= set(data["teams"])

    def test_detail_is_case_insensitive(self, client: TestClient):
        lower = client.get("/confederation/conmebol").json()
        upper = client.get("/confederation/CONMEBOL").json()
        assert lower == upper

    def test_detail_unknown_returns_error(self, client: TestClient):
        data = client.get("/confederation/ATLANTIS").json()
        assert data["error"] is True

    def test_detail_filters_narrow_results(self, client: TestClient):
        detail = client.get("/confederation/UEFA").json()
        all_matches = detail["total_matches"]
        assert all_matches > 0
        tournaments = detail["tournaments"]
        assert tournaments, "UEFA detail should list at least one tournament"

        tournament = tournaments[0]
        narrowed = client.get(
            "/confederation/UEFA", params={"tournaments": tournament}
        ).json()
        assert 0 < narrowed["total_matches"] <= all_matches

    def test_every_match_has_a_member_team(self, client: TestClient):
        """A confederation filter must only return matches with one of its teams."""
        uefa_teams = set(client.get("/confederation/UEFA").json()["teams"])
        matches = client.get("/confederation/UEFA/matches").json()["matches"]
        assert matches, "UEFA should have matches in the dataset"
        offenders = [
            m
            for m in matches
            if m["home_team"] not in uefa_teams and m["away_team"] not in uefa_teams
        ]
        assert not offenders, f"non-UEFA match leaked in: {offenders[:1]}"

    def test_team_aliases_are_matched(self, client: TestClient):
        """Dataset spellings like 'Republic of Ireland' must count as UEFA."""
        teams = client.get("/confederation/UEFA").json()["teams"]
        assert "Republic of Ireland" in teams

        # Filtering by the alias must never return a match without that team.
        matches = client.get(
            "/confederation/UEFA/matches", params={"teams": "Republic of Ireland"}
        ).json()["matches"]
        assert all(
            "Republic of Ireland" in (m["home_team"], m["away_team"]) for m in matches
        )


class TestConfederationMatches:
    def test_matches_shape(self, client: TestClient):
        resp = client.get("/confederation/AFC/matches")
        _assert_status(resp)
        data = resp.json()
        _assert_keys(data, {"confederation", "matches", "total"}, "matches")
        assert data["total"] == len(data["matches"])

    def test_match_item_shape(self, client: TestClient):
        matches = client.get("/confederation/UEFA/matches").json()["matches"]
        assert matches, "UEFA should have matches in the dataset"
        item = matches[0]
        _assert_keys(
            item,
            {
                "date",
                "home_team",
                "away_team",
                "home_score",
                "away_score",
                "tournament",
                "city",
                "country",
                "goals",
            },
            "matches.item",
        )

    def test_matches_unknown_returns_error(self, client: TestClient):
        assert client.get("/confederation/ATLANTIS/matches").json()["error"] is True
