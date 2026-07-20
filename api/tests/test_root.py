"""Tests for GET / endpoint."""

from fastapi.testclient import TestClient


class TestRoot:
    def test_root_redirects_to_scalar(self, client: TestClient):
        """Root endpoint redirects to the interactive API docs."""
        resp = client.get("/", follow_redirects=False)
        assert resp.status_code == 307
        assert resp.headers["location"] == "/scalar"

    def test_root_redirect_followed_returns_html(self, client: TestClient):
        """Following the root redirect serves the docs page."""
        resp = client.get("/", follow_redirects=True)
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "text/html; charset=utf-8"
        assert "scalar" in resp.text.lower()
