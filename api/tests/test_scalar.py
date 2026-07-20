"""Tests for the self-hosted Scalar API docs UI."""

from fastapi.testclient import TestClient


class TestScalarDocs:
    def test_scalar_page_loads(self, client: TestClient):
        """The Scalar docs page is served and contains the return link."""
        resp = client.get("/scalar")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/html")
        assert "Back to site" in resp.text
        # No external CDN dependency.
        assert "cdn.jsdelivr.net" not in resp.text

    def test_scalar_js_is_self_hosted(self, client: TestClient):
        """The Scalar JavaScript is served locally, not from a CDN."""
        resp = client.get("/scalar/api-reference.js")
        assert resp.status_code == 200
        assert resp.headers["content-type"].startswith("text/javascript")
        assert "cdn.jsdelivr.net" not in resp.text

    def test_swagger_removed(self, client: TestClient):
        """Swagger UI is no longer served."""
        assert client.get("/docs").status_code == 404

    def test_redoc_removed(self, client: TestClient):
        """ReDoc is no longer served."""
        assert client.get("/redoc").status_code == 404
