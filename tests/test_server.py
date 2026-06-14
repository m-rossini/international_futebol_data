"""Integration tests for all REST API endpoints.

Each test verifies:
  - endpoint exists (200 or appropriate status)
  - response has the correct shape (keys, types)
  - parameters are respected (sorting, top_n, case-insensitive, etc.)
Contents of individual records are NOT validated — only structural correctness.
"""

import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
#  Helpers
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


# ===========================================================================
#  GET /health
# ===========================================================================

class TestHealth:
    def test_health_exists(self, client: TestClient):
        resp = client.get("/health")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"status", "data_loaded"}, "health")
        assert body["status"] == "ok"
        assert body["data_loaded"] is True


# ===========================================================================
#  GET /version
# ===========================================================================

class TestVersion:
    def test_version_exists(self, client: TestClient):
        resp = client.get("/version")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"version"}, "version")
        assert isinstance(body["version"], str)
        assert len(body["version"]) > 0

    def test_version_semver(self, client: TestClient):
        """Version should follow semver-like pattern (e.g. 1.0.1)."""
        resp = client.get("/version")
        v = resp.json()["version"]
        parts = v.split(".")
        assert len(parts) == 3, f"Version '{v}' is not semver (expected X.Y.Z)"
        for p in parts:
            assert p.isdigit(), f"Version segment '{p}' is not numeric"


# ===========================================================================
#  GET /
# ===========================================================================

class TestRoot:
    def test_root_exists(self, client: TestClient):
        resp = client.get("/")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"service", "status", "version", "endpoints", "data_loaded"}, "root")

    def test_root_keys(self, client: TestClient):
        resp = client.get("/")
        body = resp.json()
        assert body["service"] == "International Football Stats"
        assert body["status"] == "running"
        assert isinstance(body["version"], str)
        assert len(body["version"]) > 0
        assert isinstance(body["endpoints"], dict)
        assert isinstance(body["data_loaded"], bool)
        assert body["data_loaded"] is True


# ===========================================================================
#  POST /reload
# ===========================================================================

class TestReload:
    def test_reload_ok(self, client: TestClient):
        resp = client.post("/reload")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"message", "matches_loaded", "goalscorers_loaded",
                             "shootouts_loaded", "former_names_loaded"}, "reload")
        assert body["matches_loaded"] > 0
        assert body["goalscorers_loaded"] > 0


# ===========================================================================
#  GET /summary
# ===========================================================================

class TestSummary:
    def test_summary_ok(self, client: TestClient):
        resp = client.get("/summary")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"results", "goalscorers", "shootouts", "former_names"}, "summary")

    def test_summary_results_keys(self, client: TestClient):
        resp = client.get("/summary")
        body = resp.json()
        _assert_keys(body["results"], {
            "total_matches", "date_range", "tournaments_count",
            "most_common_tournament", "unique_home_teams", "unique_away_teams",
            "total_goals", "avg_goals_per_match", "home_advantage",
        }, "summary.results")

    def test_summary_goalscorers_keys(self, client: TestClient):
        resp = client.get("/summary")
        body = resp.json()
        _assert_keys(body["goalscorers"], {
            "total_goals_recorded", "unique_scorers", "unique_teams_scored_for",
            "date_range", "own_goals", "penalty_goals", "top_scorer",
        }, "summary.goalscorers")

    def test_summary_shootouts_keys(self, client: TestClient):
        resp = client.get("/summary")
        body = resp.json()
        _assert_keys(body["shootouts"], {
            "total_shootouts", "date_range", "unique_winners", "most_common_winner",
        }, "summary.shootouts")

    def test_summary_former_names_keys(self, client: TestClient):
        resp = client.get("/summary")
        body = resp.json()
        _assert_keys(body["former_names"], {
            "total_renamed_countries", "unique_current_names",
            "unique_former_names", "earliest_rename", "latest_rename",
        }, "summary.former_names")

    def test_summary_types(self, client: TestClient):
        resp = client.get("/summary")
        body = resp.json()
        r = body["results"]
        assert isinstance(r["total_matches"], int)
        assert isinstance(r["tournaments_count"], int)
        assert isinstance(r["total_goals"], int)
        assert isinstance(r["avg_goals_per_match"], float)
        assert isinstance(r["date_range"]["from"], str)
        assert isinstance(r["home_advantage"]["home_win_pct"], float)


# ===========================================================================
#  GET /team/{team_name}
# ===========================================================================

class TestTeam:
    def test_team_known(self, client: TestClient):
        resp = client.get(f"/team/{_KNOWN_TEAM}")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"team", "matches_played", "wins", "draws", "losses", "win_rate"}, "team")
        assert body["team"] == _KNOWN_TEAM

    def test_team_case_insensitive_lower(self, client: TestClient):
        resp = client.get(f"/team/{_KNOWN_TEAM_LOWER}")
        _assert_status(resp)
        assert resp.json()["team"] == _KNOWN_TEAM

    def test_team_case_insensitive_mixed(self, client: TestClient):
        resp = client.get(f"/team/{_KNOWN_TEAM_MIXED}")
        _assert_status(resp)
        assert resp.json()["team"] == _KNOWN_TEAM

    def test_team_accent_insensitive(self, client: TestClient):
        """Team with accent can be queried without accents."""
        resp = client.get(f"/team/{_ACCENTED_TEAM_FLAT}")
        _assert_status(resp)
        assert resp.json()["team"] == _ACCENTED_TEAM

    def test_team_unknown(self, client: TestClient):
        resp = client.get("/team/NonExistentTeamXXX")
        _assert_status(resp, 200)
        body = resp.json()
        assert body.get("error") is True
        assert "message" in body

    def test_team_types(self, client: TestClient):
        resp = client.get(f"/team/{_KNOWN_TEAM}")
        body = resp.json()
        assert isinstance(body["matches_played"], int)
        assert isinstance(body["wins"], int)
        assert isinstance(body["draws"], int)
        assert isinstance(body["losses"], int)
        assert isinstance(body["win_rate"], (int, float))


# ===========================================================================
#  GET /head_to_head
# ===========================================================================

class TestHeadToHead:
    def test_h2h_known(self, client: TestClient):
        resp = client.get(f"/head_to_head?team1={_KNOWN_TEAM}&team2={_KNOWN_TEAM2}")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"team1", "team2", "matches", "draws",
                             f"{_KNOWN_TEAM}_wins", f"{_KNOWN_TEAM2}_wins",
                             f"{_KNOWN_TEAM}_goals", f"{_KNOWN_TEAM2}_goals"}, "h2h")

    def test_h2h_case_insensitive(self, client: TestClient):
        resp = client.get(f"/head_to_head?team1={_KNOWN_TEAM_LOWER}&team2={_KNOWN_TEAM2.upper()}")
        _assert_status(resp)
        body = resp.json()
        assert body["team1"] == _KNOWN_TEAM
        assert body["team2"] == _KNOWN_TEAM2

    def test_h2h_unknown_team(self, client: TestClient):
        resp = client.get("/head_to_head?team1=DoesNotExist&team2=AlsoFake")
        _assert_status(resp, 200)
        assert resp.json().get("error") is True

    def test_h2h_types(self, client: TestClient):
        resp = client.get(f"/head_to_head?team1={_KNOWN_TEAM}&team2={_KNOWN_TEAM2}")
        body = resp.json()
        assert isinstance(body["matches"], int)
        assert isinstance(body["draws"], int)
        assert isinstance(body[f"{_KNOWN_TEAM}_wins"], int)
        assert isinstance(body[f"{_KNOWN_TEAM}_goals"], int)


# ===========================================================================
#  GET /top_scorers
# ===========================================================================

class TestTopScorers:
    def test_top_scorers_default(self, client: TestClient):
        resp = client.get("/top_scorers")
        _assert_status(resp)
        body = resp.json()
        assert isinstance(body, dict)
        assert len(body) == 20  # default top_n

    def test_top_scorers_custom_n(self, client: TestClient):
        resp = client.get("/top_scorers?top_n=5")
        _assert_status(resp)
        assert len(resp.json()) == 5

    def test_top_scorers_values(self, client: TestClient):
        resp = client.get("/top_scorers?top_n=3")
        body = resp.json()
        for name, goals in body.items():
            assert isinstance(name, str)
            assert isinstance(goals, int)
            assert goals > 0


# ===========================================================================
#  GET /biggest_wins
# ===========================================================================

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


# ===========================================================================
#  GET /goals_per_year
# ===========================================================================

class TestGoalsPerYear:
    def test_gpy_default(self, client: TestClient):
        resp = client.get("/goals_per_year")
        _assert_status(resp)
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_gpy_shape(self, client: TestClient):
        resp = client.get("/goals_per_year")
        item = resp.json()[0]
        _assert_keys(item, {"year", "goals", "matches", "avg_goals"}, "gpy.item")

    def test_gpy_types(self, client: TestClient):
        resp = client.get("/goals_per_year")
        item = resp.json()[0]
        assert isinstance(item["year"], int)
        assert isinstance(item["goals"], int)
        assert isinstance(item["matches"], int)
        assert isinstance(item["avg_goals"], float)

    def test_gpy_avg_goals_correct(self, client: TestClient):
        resp = client.get("/goals_per_year")
        for item in resp.json():
            expected = round(item["goals"] / item["matches"], 2)
            assert item["avg_goals"] == expected, (
                f"Year {item['year']}: {item['avg_goals']} != {expected}"
            )

    def test_gpy_default_desc_by_goals(self, client: TestClient):
        resp = client.get("/goals_per_year")
        data = resp.json()
        goals = [d["goals"] for d in data]
        for i in range(len(goals) - 1):
            assert goals[i] >= goals[i + 1], (
                f"Not sorted desc by goals: {goals}"
            )

    def test_gpy_sort_by_year_asc(self, client: TestClient):
        resp = client.get("/goals_per_year?sort_by=year&order=asc")
        data = resp.json()
        years = [d["year"] for d in data]
        for i in range(len(years) - 1):
            assert years[i] < years[i + 1], (
                f"Not sorted asc by year: {years}"
            )

    def test_gpy_sort_by_year_desc(self, client: TestClient):
        resp = client.get("/goals_per_year?sort_by=year&order=desc")
        data = resp.json()
        years = [d["year"] for d in data]
        for i in range(len(years) - 1):
            assert years[i] > years[i + 1], (
                f"Not sorted desc by year: {years}"
            )

    def test_gpy_sort_by_ratio_asc(self, client: TestClient):
        resp = client.get("/goals_per_year?sort_by=ratio&order=asc")
        data = resp.json()
        ratios = [d["avg_goals"] for d in data]
        for i in range(len(ratios) - 1):
            assert ratios[i] <= ratios[i + 1], (
                f"Not sorted asc by ratio: {ratios}"
            )

    def test_gpy_sort_by_ratio_desc(self, client: TestClient):
        resp = client.get("/goals_per_year?sort_by=ratio&order=desc")
        data = resp.json()
        ratios = [d["avg_goals"] for d in data]
        for i in range(len(ratios) - 1):
            assert ratios[i] >= ratios[i + 1], (
                f"Not sorted desc by ratio: {ratios}"
            )

    def test_gpy_sort_by_goals_asc(self, client: TestClient):
        resp = client.get("/goals_per_year?sort_by=goals&order=asc")
        data = resp.json()
        goals = [d["goals"] for d in data]
        for i in range(len(goals) - 1):
            assert goals[i] <= goals[i + 1], (
                f"Not sorted asc by goals: {goals}"
            )

    def test_gpy_invalid_sort_by(self, client: TestClient):
        """Invalid sort_by raises a 500 (ValueError propagates from engine)."""
        resp = client.get("/goals_per_year?sort_by=invalid")
        assert resp.status_code == 500


# ===========================================================================
#  GET /most/{stat}  —  team stats
# ===========================================================================

_TEAM_MOST_STATS = ["wins", "losses", "draws", "win_rate",
                     "loss_rate", "goals_pro", "goals_against", "matches"]


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
        # The value column should be int for some, float for rates
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


# ===========================================================================
#  GET /most/{stat}  —  country & city
# ===========================================================================

class TestMostCountries:
    def test_most_country(self, client: TestClient):
        resp = client.get("/most/country")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"stat", "top_n", "ranking"}, "most/country")

    def test_most_countries_alias(self, client: TestClient):
        resp = client.get("/most/countries")
        _assert_status(resp)
        assert resp.json()["stat"] == "countries"

    def test_most_country_ranking_shape(self, client: TestClient):
        resp = client.get("/most/country")
        item = resp.json()["ranking"][0]
        _assert_keys(item, {"country", "matches"}, "most/country.item")
        assert isinstance(item["country"], str)
        assert isinstance(item["matches"], int)

    def test_most_country_descending(self, client: TestClient):
        resp = client.get("/most/country")
        matches = [r["matches"] for r in resp.json()["ranking"]]
        for i in range(len(matches) - 1):
            assert matches[i] >= matches[i + 1]

    def test_most_country_top_n(self, client: TestClient):
        resp = client.get("/most/country?top_n=5")
        assert len(resp.json()["ranking"]) == 5


class TestMostCities:
    def test_most_city(self, client: TestClient):
        resp = client.get("/most/city")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"stat", "top_n", "ranking"}, "most/city")

    def test_most_cities_alias(self, client: TestClient):
        resp = client.get("/most/cities")
        _assert_status(resp)
        assert resp.json()["stat"] == "cities"

    def test_most_city_ranking_shape(self, client: TestClient):
        resp = client.get("/most/city")
        item = resp.json()["ranking"][0]
        _assert_keys(item, {"city", "matches"}, "most/city.item")
        assert isinstance(item["city"], str)
        assert isinstance(item["matches"], int)

    def test_most_city_descending(self, client: TestClient):
        resp = client.get("/most/city")
        matches = [r["matches"] for r in resp.json()["ranking"]]
        for i in range(len(matches) - 1):
            assert matches[i] >= matches[i + 1]

    def test_most_city_top_n(self, client: TestClient):
        resp = client.get("/most/city?top_n=5")
        assert len(resp.json()["ranking"]) == 5


# ===========================================================================
#  GET /tournaments
# ===========================================================================

class TestTournaments:
    def test_tournaments_exists(self, client: TestClient):
        resp = client.get("/tournaments")
        _assert_status(resp)
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_tournaments_shape(self, client: TestClient):
        resp = client.get("/tournaments")
        item = resp.json()[0]
        _assert_keys(item, {
            "tournament", "first_year", "last_year", "editions",
            "matches", "total_goals", "home_wins", "away_wins",
            "draws", "avg_goals", "unique_teams",
        }, "tournaments.item")

    def test_tournaments_types(self, client: TestClient):
        resp = client.get("/tournaments")
        item = resp.json()[0]
        assert isinstance(item["tournament"], str)
        assert isinstance(item["first_year"], int)
        assert isinstance(item["matches"], int)
        assert isinstance(item["total_goals"], int)
        assert isinstance(item["avg_goals"], float)

    def test_tournaments_sorted_desc_by_matches(self, client: TestClient):
        resp = client.get("/tournaments")
        data = resp.json()
        matches = [t["matches"] for t in data]
        for i in range(len(matches) - 1):
            assert matches[i] >= matches[i + 1]


# ===========================================================================
#  GET /tournament/{tournament_name}
# ===========================================================================

class TestTournament:
    def test_tournament_known(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"tournament", "summary", "yearly"}, "tournament")

    def test_tournament_summary_keys(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}")
        s = resp.json()["summary"]
        _assert_keys(s, {
            "first_year", "last_year", "editions", "matches", "total_goals",
            "avg_goals_per_match", "home_wins", "away_wins", "draws",
            "unique_teams", "biggest_win", "top_teams_by_wins",
            "top_host_countries", "top_host_cities",
        }, "tournament.summary")

    def test_tournament_yearly_shape(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}")
        yearly = resp.json()["yearly"]
        assert len(yearly) > 0
        _assert_keys(yearly[0], {
            "year", "matches", "goals", "avg_goals",
            "home_wins", "away_wins", "draws", "teams", "host_country",
        }, "tournament.yearly")

    def test_tournament_yearly_types(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}")
        item = resp.json()["yearly"][0]
        assert isinstance(item["year"], int)
        assert isinstance(item["matches"], int)
        assert isinstance(item["goals"], int)
        assert isinstance(item["avg_goals"], float)

    def test_tournament_unknown(self, client: TestClient):
        resp = client.get("/tournament/NonExistentTournamentXXX")
        _assert_status(resp, 200)
        body = resp.json()
        assert body.get("error") is True

    def test_tournament_biggest_win_shape(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}")
        bw = resp.json()["summary"]["biggest_win"]
        assert bw is not None
        _assert_keys(bw, {"date", "home_team", "away_team", "home_score", "away_score"}, "biggest_win")

    def test_tournament_top_teams_shape(self, client: TestClient):
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}")
        teams = resp.json()["summary"]["top_teams_by_wins"]
        assert len(teams) > 0
        _assert_keys(teams[0], {"team", "wins"}, "top_teams")
        assert isinstance(teams[0]["wins"], int)


# ===========================================================================
#  GET /cities
# ===========================================================================

class TestCities:
    def test_cities_exists(self, client: TestClient):
        resp = client.get("/cities")
        _assert_status(resp)
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_cities_shape(self, client: TestClient):
        resp = client.get("/cities")
        item = resp.json()[0]
        _assert_keys(item, {
            "city", "country", "matches", "total_goals", "home_wins",
            "away_wins", "draws", "unique_teams", "tournaments",
            "first_year", "last_year", "avg_goals",
        }, "cities.item")

    def test_cities_types(self, client: TestClient):
        resp = client.get("/cities")
        item = resp.json()[0]
        assert isinstance(item["city"], str)
        assert isinstance(item["country"], str)
        assert isinstance(item["matches"], int)
        assert isinstance(item["total_goals"], int)
        assert isinstance(item["avg_goals"], float)
        assert isinstance(item["first_year"], int)

    def test_cities_sorted_desc_by_matches(self, client: TestClient):
        resp = client.get("/cities")
        data = resp.json()
        matches = [c["matches"] for c in data]
        for i in range(len(matches) - 1):
            assert matches[i] >= matches[i + 1]


# ===========================================================================
#  GET /city/{city_name}
# ===========================================================================

class TestCity:
    def test_city_known(self, client: TestClient):
        resp = client.get(f"/city/{_KNOWN_CITY}")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"city", "country", "summary"}, "city")

    def test_city_case_insensitive(self, client: TestClient):
        resp = client.get(f"/city/{_KNOWN_CITY_LOWER}")
        _assert_status(resp)
        assert resp.json()["city"] == _KNOWN_CITY

    def test_city_summary_keys(self, client: TestClient):
        resp = client.get(f"/city/{_KNOWN_CITY}")
        s = resp.json()["summary"]
        _assert_keys(s, {
            "matches", "first_year", "last_year", "total_goals",
            "avg_goals_per_match", "home_wins", "away_wins", "draws",
            "unique_teams", "unique_tournaments", "biggest_win",
            "top_teams_by_wins", "top_tournaments",
        }, "city.summary")

    def test_city_summary_types(self, client: TestClient):
        resp = client.get(f"/city/{_KNOWN_CITY}")
        s = resp.json()["summary"]
        assert isinstance(s["matches"], int)
        assert isinstance(s["total_goals"], int)
        assert isinstance(s["avg_goals_per_match"], float)
        assert isinstance(s["first_year"], int)
        assert isinstance(s["unique_teams"], int)
        assert isinstance(s["unique_tournaments"], int)

    def test_city_biggest_win_shape(self, client: TestClient):
        resp = client.get(f"/city/{_KNOWN_CITY}")
        bw = resp.json()["summary"]["biggest_win"]
        assert bw is not None
        _assert_keys(bw, {"date", "home_team", "away_team", "home_score",
                           "away_score", "tournament"}, "city.biggest_win")

    def test_city_top_teams_shape(self, client: TestClient):
        resp = client.get(f"/city/{_KNOWN_CITY}")
        teams = resp.json()["summary"]["top_teams_by_wins"]
        assert len(teams) > 0
        _assert_keys(teams[0], {"team", "wins"}, "city.top_teams")

    def test_city_unknown(self, client: TestClient):
        resp = client.get("/city/NonExistentCityXXX")
        _assert_status(resp, 200)
        assert resp.json().get("error") is True


# ===========================================================================
#  GET /countries
# ===========================================================================

class TestCountries:
    def test_countries_exists(self, client: TestClient):
        resp = client.get("/countries")
        _assert_status(resp)
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_countries_shape(self, client: TestClient):
        resp = client.get("/countries")
        item = resp.json()[0]
        _assert_keys(item, {
            "country", "matches", "total_goals", "home_wins", "away_wins",
            "draws", "unique_teams", "tournaments", "cities",
            "first_year", "last_year", "avg_goals",
        }, "countries.item")

    def test_countries_types(self, client: TestClient):
        resp = client.get("/countries")
        item = resp.json()[0]
        assert isinstance(item["country"], str)
        assert isinstance(item["matches"], int)
        assert isinstance(item["total_goals"], int)
        assert isinstance(item["avg_goals"], float)
        assert isinstance(item["cities"], int)

    def test_countries_sorted_desc_by_matches(self, client: TestClient):
        resp = client.get("/countries")
        data = resp.json()
        matches = [c["matches"] for c in data]
        for i in range(len(matches) - 1):
            assert matches[i] >= matches[i + 1]


# ===========================================================================
#  GET /country/{country_name}
# ===========================================================================

class TestCountry:
    def test_country_known(self, client: TestClient):
        resp = client.get(f"/country/{_KNOWN_COUNTRY}")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"country", "summary"}, "country")

    def test_country_case_insensitive(self, client: TestClient):
        resp = client.get(f"/country/{_KNOWN_COUNTRY_LOWER}")
        _assert_status(resp)
        assert resp.json()["country"] == _KNOWN_COUNTRY

    def test_country_summary_keys(self, client: TestClient):
        resp = client.get(f"/country/{_KNOWN_COUNTRY}")
        s = resp.json()["summary"]
        _assert_keys(s, {
            "matches", "first_year", "last_year", "total_goals",
            "avg_goals_per_match", "home_wins", "away_wins", "draws",
            "unique_teams", "unique_tournaments", "unique_cities",
            "biggest_win", "top_teams_by_wins", "top_tournaments", "top_cities",
        }, "country.summary")

    def test_country_summary_types(self, client: TestClient):
        resp = client.get(f"/country/{_KNOWN_COUNTRY}")
        s = resp.json()["summary"]
        assert isinstance(s["matches"], int)
        assert isinstance(s["total_goals"], int)
        assert isinstance(s["avg_goals_per_match"], float)
        assert isinstance(s["unique_teams"], int)
        assert isinstance(s["unique_cities"], int)

    def test_country_biggest_win_shape(self, client: TestClient):
        resp = client.get(f"/country/{_KNOWN_COUNTRY}")
        bw = resp.json()["summary"]["biggest_win"]
        assert bw is not None
        _assert_keys(bw, {"date", "home_team", "away_team", "home_score",
                           "away_score", "tournament", "city"}, "country.biggest_win")

    def test_country_top_teams_shape(self, client: TestClient):
        resp = client.get(f"/country/{_KNOWN_COUNTRY}")
        teams = resp.json()["summary"]["top_teams_by_wins"]
        assert len(teams) > 0
        _assert_keys(teams[0], {"team", "wins"}, "country.top_teams")

    def test_country_unknown(self, client: TestClient):
        resp = client.get("/country/NonExistentCountryXXX")
        _assert_status(resp, 200)
        assert resp.json().get("error") is True


# ===========================================================================
#  GET /query
# ===========================================================================

class TestQuery:
    def test_query_how_many_matches(self, client: TestClient):
        resp = client.get("/query?q=how+many+matches")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"question", "answer", "data"}, "query")
        assert isinstance(body["answer"], str)
        assert isinstance(body["data"], dict)

    def test_query_team_stats(self, client: TestClient):
        resp = client.get(f"/query?q={_KNOWN_TEAM}+stats")
        _assert_status(resp)
        body = resp.json()
        assert "data" in body

    def test_query_head_to_head(self, client: TestClient):
        resp = client.get(f"/query?q={_KNOWN_TEAM}+vs+{_KNOWN_TEAM2}")
        _assert_status(resp)
        body = resp.json()
        assert "data" in body

    def test_query_top_scorers(self, client: TestClient):
        resp = client.get("/query?q=top+10+scorers")
        _assert_status(resp)
        body = resp.json()
        assert body["data"] is not None

    def test_query_biggest_wins(self, client: TestClient):
        resp = client.get("/query?q=biggest+wins")
        _assert_status(resp)

    def test_query_goals_per_year(self, client: TestClient):
        resp = client.get("/query?q=goals+per+year")
        _assert_status(resp)
        body = resp.json()
        assert isinstance(body["data"], list)

    def test_query_summary(self, client: TestClient):
        resp = client.get("/query?q=summary")
        _assert_status(resp)
        body = resp.json()
        assert "data" in body

    def test_query_unknown(self, client: TestClient):
        resp = client.get("/query?q=this+is+gibberish+xyz123")
        _assert_status(resp)
        body = resp.json()
        assert body["data"] is None  # fallback returns None


# ===========================================================================
#  Filter tests
# ===========================================================================

class TestFilters:
    """Verify the ?tournaments=, ?countries=, ?date_from=, ?date_to= filter params work."""

    def test_root_has_filter_params_key(self, client: TestClient):
        resp = client.get("/")
        body = resp.json()
        assert "filter_params" in body
        _assert_keys(body["filter_params"], {"tournaments", "countries", "date_from", "date_to"})

    def test_summary_filter_tournament(self, client: TestClient):
        """Filtering by a tournament should reduce totals."""
        full = client.get("/summary").json()
        filt = client.get("/summary?tournaments=FIFA+World+Cup").json()
        assert filt["results"]["total_matches"] < full["results"]["total_matches"]
        assert filt["results"]["total_matches"] > 0

    def test_summary_filter_multiple_tournaments(self, client: TestClient):
        """Multiple tournament values (OR within the list)."""
        resp = client.get("/summary?tournaments=Friendly&tournaments=FIFA+World+Cup").json()
        assert resp["results"]["total_matches"] > 0

    def test_summary_filter_country(self, client: TestClient):
        """Filter by host country."""
        full = client.get("/summary").json()
        filt = client.get("/summary?countries=Brazil").json()
        assert filt["results"]["total_matches"] < full["results"]["total_matches"]
        assert filt["results"]["total_matches"] > 0

    def test_summary_filter_date_from(self, client: TestClient):
        """Filter by start date (inclusive)."""
        full = client.get("/summary").json()
        filt = client.get("/summary?date_from=2000-01-01").json()
        assert filt["results"]["total_matches"] < full["results"]["total_matches"]
        assert filt["results"]["total_matches"] > 0

    def test_summary_filter_date_to(self, client: TestClient):
        """Filter by end date (inclusive)."""
        filt = client.get("/summary?date_to=1900-01-01").json()
        assert filt["results"]["total_matches"] >= 0

    def test_summary_filter_date_range(self, client: TestClient):
        """Filter by both start and end dates."""
        full = client.get("/summary").json()
        filt = client.get("/summary?date_from=2000-01-01&date_to=2010-12-31").json()
        assert filt["results"]["total_matches"] < full["results"]["total_matches"]
        assert filt["results"]["total_matches"] > 0

    def test_summary_filter_all_params(self, client: TestClient):
        """Combine tournament + country + date range."""
        resp = client.get(
            "/summary?tournaments=FIFA+World+Cup&countries=Germany&date_from=1990&date_to=2020"
        ).json()
        assert resp["results"]["total_matches"] > 0

    def test_filter_empty_result(self, client: TestClient):
        """Filter that matches nothing should return 0 matches."""
        resp = client.get("/summary?tournaments=NonExistentTournamentXYZ").json()
        assert resp["results"]["total_matches"] == 0

    def test_filter_empty_most_teams(self, client: TestClient):
        """most/teams with a filter that returns nothing should give empty ranking."""
        resp = client.get("/most/wins?tournaments=NonExistentTournamentXYZ&top_n=5")
        _assert_status(resp)
        body = resp.json()
        assert len(body["ranking"]) == 0

    def test_filter_on_tournament_endpoint(self, client: TestClient):
        """Tournament-specific endpoint can be filtered by country/date."""
        resp = client.get(f"/tournament/{_KNOWN_TOURNAMENT}?date_from=2000")
        _assert_status(resp)
        body = resp.json()
        assert body["tournament"] == _KNOWN_TOURNAMENT
        assert body["summary"]["matches"] > 0

    def test_filter_on_city_endpoint(self, client: TestClient):
        """City endpoint can be filtered by tournament."""
        known = _KNOWN_CITY
        resp = client.get(f"/city/{known}?tournaments=FIFA+World+Cup")
        _assert_status(resp)
        body = resp.json()
        assert body["city"] == known

    def test_filter_on_country_endpoint(self, client: TestClient):
        """Country endpoint can be filtered by date range."""
        resp = client.get(f"/country/{_KNOWN_COUNTRY}?date_from=2000&date_to=2010")
        _assert_status(resp)
        assert resp.json()["country"] == _KNOWN_COUNTRY
