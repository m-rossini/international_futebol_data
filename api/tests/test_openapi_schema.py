"""Guard against regressing to undocumented endpoints.

FastAPI emits ``{"schema": {}}`` for a 200 response when an endpoint has no
``response_model`` and no return annotation. That renders as an empty,
useless schema in Scalar and gives no field-level docs in /openapi.json.

These tests walk the generated OpenAPI document, so they catch the problem
for every endpoint rather than one at a time.
"""

import pytest
from fastapi.testclient import TestClient


def _response_schemas(spec: dict) -> list[tuple[str, dict]]:
    """Yield (endpoint_label, media_type_object) for every 200 response."""
    out = []
    for path, methods in spec.get("paths", {}).items():
        for method, op in methods.items():
            if method not in ("get", "post", "put", "patch", "delete"):
                continue
            resp = op.get("responses", {}).get("200", {})
            for media_type, obj in resp.get("content", {}).items():
                out.append((f"{method.upper()} {path} -> {media_type}", obj))
    return out


class TestNoUndocumentedResponses:
    def test_openapi_is_served(self, client: TestClient):
        resp = client.get("/openapi.json")
        assert resp.status_code == 200
        assert "paths" in resp.json()

    def test_no_response_has_an_empty_schema(self, client: TestClient):
        """Every documented 200 response must publish a real schema."""
        spec = client.get("/openapi.json").json()
        empty = [
            label
            for label, obj in _response_schemas(spec)
            if obj.get("schema") in ({}, None)
        ]
        assert not empty, (
            "These endpoints publish an empty response schema — add a "
            f"response_model: {empty}"
        )

    def test_every_schema_ref_resolves(self, client: TestClient):
        """Dangling $ref in a response schema silently breaks doc rendering."""
        spec = client.get("/openapi.json").json()
        defined = set(spec.get("components", {}).get("schemas", {}))
        dangling = []
        for label, obj in _response_schemas(spec):
            for ref in self._refs(obj.get("schema", {})):
                name = ref.rsplit("/", 1)[-1]
                if (
                    name
                    and name not in defined
                    and name
                    not in {
                        "HTTPValidationError",
                        "ValidationError",
                    }
                ):
                    dangling.append((label, name))
        assert not dangling, f"Unresolvable $ref in response schemas: {dangling}"

    @staticmethod
    def _refs(node) -> list[str]:
        """Recursively collect every $ref string in a schema node."""
        found = []
        if isinstance(node, dict):
            for k, v in node.items():
                if k == "$ref" and isinstance(v, str):
                    found.append(v)
                else:
                    found.extend(TestNoUndocumentedResponses._refs(v))
        elif isinstance(node, list):
            for item in node:
                found.extend(TestNoUndocumentedResponses._refs(item))
        return found

    @pytest.mark.parametrize(
        "path",
        [
            "/teams",
            "/team/{team_name}",
            "/team/{team_name}/matches/{year}",
            "/head_to_head",
            "/matchgoals",
            "/elo-ranking/current",
            "/elo-ranking/history/{team}",
            "/elo-ranking/decade-leaders",
            "/elo-ranking/summary",
            "/elo-ranking/at-date",
            "/city/{city_name}",
            "/country/{country_name}",
            "/tournament/{tournament_name}",
            "/years/{year}",
            "/llm/profile",
        ],
    )
    def test_endpoint_has_a_named_schema(self, client: TestClient, path):
        """These endpoints must reference a named component, not an inline blob."""
        spec = client.get("/openapi.json").json()
        op = spec["paths"][path]["get"]
        schema = op["responses"]["200"]["content"]["application/json"]["schema"]
        blob = str(schema)
        assert "$ref" in blob or "anyOf" in blob or "allOf" in blob, (
            f"{path} should reference named response models, got {schema}"
        )
