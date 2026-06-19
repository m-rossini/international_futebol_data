"""Tests for GET /top_scorers endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_status


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
