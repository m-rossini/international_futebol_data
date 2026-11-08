"""Tests for GET /former-names endpoint."""

from fastapi.testclient import TestClient

from tests.helpers import _assert_keys, _assert_status


class TestFormerNames:
    def test_former_names(self, client: TestClient):
        resp = client.get("/former-names")
        _assert_status(resp)
        body = resp.json()
        _assert_keys(body, {"total", "chains"}, "former-names")
        assert isinstance(body["total"], int)
        assert body["total"] > 0
        assert isinstance(body["chains"], list)
        assert len(body["chains"]) > 0
        _assert_keys(
            body["chains"][0],
            {"current", "former", "start_date", "end_date"},
            "former-names.chains[0]",
        )
