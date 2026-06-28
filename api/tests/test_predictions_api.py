"""Integration tests for prediction API endpoints.

Requires the server to be running with data loaded.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from football_stats.server import app
from football_stats.routers.dependencies import state

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def _ensure_data():
    """Ensure data is loaded before running tests."""
    if not state.is_loaded:
        state.reload()


class TestPredictSingleMatch:
    def test_predict_brazil_vs_argentina(self):
        """Should return valid probabilities for a classic matchup."""
        response = client.get("/predict/Brazil/Argentina")
        assert response.status_code == 200
        data = response.json()
        assert data["home_team"] == "Brazil"
        assert data["away_team"] == "Argentina"
        assert "home_win_probability" in data
        assert "draw_probability" in data
        assert "away_win_probability" in data
        total = data["home_win_probability"] + data["draw_probability"] + data["away_win_probability"]
        assert total == pytest.approx(1.0, rel=1e-4)

    def test_predict_with_neutral(self):
        """Neutral venue should remove home advantage."""
        response = client.get("/predict/Brazil/Argentina?neutral=true")
        assert response.status_code == 200
        data = response.json()
        assert data["home_advantage_applied"] == 0
        assert data["neutral_venue"] is True

    def test_predict_unknown_team(self):
        """Unknown teams should still return a prediction with a note."""
        response = client.get("/predict/Brazil/NowhereUnited")
        assert response.status_code == 200
        data = response.json()
        assert "unknown_teams" in data
        assert "NowhereUnited" in "".join(data["unknown_teams"]).replace(" ", "")
        # Actually let's check properly
        assert any("NowhereUnited" in u for u in data["unknown_teams"])

    def test_predict_without_data(self, monkeypatch):
        """Should return 503 if ELO data not loaded."""
        monkeypatch.setattr(state, "elo_ratings", None)
        response = client.get("/predict/Brazil/Argentina")
        assert response.status_code == 503

    def test_predict_small_gap(self):
        """Closely matched teams should have distributed probabilities."""
        response = client.get("/predict/France/Germany")
        assert response.status_code == 200
        data = response.json()
        for key in ("home_win_probability", "draw_probability", "away_win_probability"):
            assert 0.1 <= data[key] <= 0.7


class TestPredictUpcoming:
    def test_upcoming_endpoint(self):
        """Should return predictions or an empty list."""
        response = client.get("/predict/upcoming?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert "total_upcoming" in data
        assert "predictions" in data
        # Either there are upcoming matches or a note
        if data["total_upcoming"] > 0:
            for pred in data["predictions"]:
                assert "home_team" in pred
                assert "away_team" in pred
                assert "home_win_probability" in pred

    def test_upcoming_high_confidence(self):
        """Filtering by high confidence should work."""
        response = client.get("/predict/upcoming?limit=10&min_probability=0.9")
        assert response.status_code == 200
        data = response.json()
        for pred in data["predictions"]:
            assert pred["confidence"] >= 0.9


class TestPredictHeadToHead:
    def test_h2h_query(self):
        """Query-parameter based endpoint should work."""
        response = client.get("/predict/head-to-head?home_team=Spain&away_team=Portugal")
        assert response.status_code == 200
        data = response.json()
        assert data["home_team"] == "Spain"
        assert data["away_team"] == "Portugal"
        total = data["home_win_probability"] + data["draw_probability"] + data["away_win_probability"]
        assert total == pytest.approx(1.0, rel=1e-4)

    def test_h2h_neutral(self):
        """Neutral venue via query params should work."""
        response = client.get(
            "/predict/head-to-head?home_team=Spain&away_team=Portugal&at_neutral=true"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["neutral_venue"] is True
