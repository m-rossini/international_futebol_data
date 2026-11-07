import pytest
from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status

from football_stats.state import state as _state  # noqa: E402

_HAS_SQUADS = _state.squads is not None and len(_state.squads) > 0


class TestSquads:
    def test_squads_list(self, client: TestClient):
        if not _HAS_SQUADS:
            pytest.skip("squads.csv not available in this DATA_DIR")
        resp = client.get("/squads?limit=5")
        _assert_status(resp)
        body = resp.json()
        assert isinstance(body, list)
        assert 0 < len(body) <= 5
        _assert_keys(
            body[0],
            {"match_date", "home_team", "away_team"},
            "squads[0]",
        )

    def test_squads_pagination(self, client: TestClient):
        if not _HAS_SQUADS:
            pytest.skip("squads.csv not available in this DATA_DIR")
        first = client.get("/squads?limit=2&offset=0").json()
        second = client.get("/squads?limit=2&offset=2").json()
        assert len(first) == 2
        assert len(second) == 2
        ids_first = [(m["match_date"], m["home_team"], m["away_team"]) for m in first]
        ids_second = [(m["match_date"], m["home_team"], m["away_team"]) for m in second]
        assert ids_first != ids_second

    def test_squad_detail_known(self, client: TestClient):
        if not _HAS_SQUADS:
            pytest.skip("squads.csv not available in this DATA_DIR")
        matches = client.get("/squads?limit=1").json()
        m = matches[0]
        resp = client.get(
            f"/squads/{m['match_date']}/{m['home_team']}/{m['away_team']}"
        )
        _assert_status(resp)
        body = resp.json()
        _assert_keys(
            body,
            {"match_date", "home_team", "away_team", "squads"},
            "squad detail",
        )
        assert len(body["squads"]) == 2  # home + away
        squad = body["squads"][0]
        _assert_keys(squad, {"team", "xi", "bench"}, "squad team")
        if squad["xi"]:
            player = squad["xi"][0]
            _assert_keys(
                player, {"player_name", "shirt_no", "position", "captain"}, "player"
            )

    def test_squad_detail_unknown(self, client: TestClient):
        resp = client.get("/squads/1900-01-01/NonExistent/NonExistent")
        _assert_status(resp, 200)
        assert resp.json().get("error") is True
