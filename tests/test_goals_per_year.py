"""Tests for GET /goals_per_year endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status


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
