"""Scalar API documentation UI — modern alternative to Swagger UI / ReDoc."""

from fastapi import APIRouter
from fastapi.responses import HTMLResponse

SCALAR_HTML = """<!doctype html>
<html>
<head>
    <title>International Football Stats — API Reference</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
    <script id="api-reference" data-url="/openapi.json"></script>
    <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>"""

router = APIRouter(tags=["Docs"])


@router.get("/scalar", include_in_schema=False)
async def scalar_ui():
    """Scalar API documentation — modern, searchable, dark-mode-capable UI."""
    return HTMLResponse(SCALAR_HTML)
