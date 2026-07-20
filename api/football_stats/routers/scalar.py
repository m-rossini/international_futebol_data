"""Scalar API documentation UI — self-hosted, no external links."""

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse, HTMLResponse
from scalar_fastapi import Theme, get_scalar_api_reference

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
SCALAR_JS_PATH = STATIC_DIR / "scalar-api-reference.js"

# Blank inline favicon (data URI) so the page makes no external favicon request.
BLANK_FAVICON = (
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E"
    "%3C/svg%3E"
)

# Floating "Back to site" button so users can return to the web app.
RETURN_BANNER = """
<a href="/" title="Back to site"
   style="position:fixed;top:12px;left:12px;z-index:100000;
          display:inline-flex;align-items:center;gap:6px;
          padding:8px 14px;border-radius:8px;
          background:#009485;color:#fff;font:600 14px/1 system-ui,sans-serif;
          text-decoration:none;box-shadow:0 2px 8px rgba(0,0,0,.25)">
  &larr; Back to site
</a>
"""

# Hide Scalar's external "scalar.com" branding links.
NO_EXTERNAL_LINKS_CSS = "a[href*='scalar.com']{display:none!important}"


def _scalar_page_html() -> str:
    html = get_scalar_api_reference(
        openapi_url="/openapi.json",
        title="International Football Stats — API Reference",
        scalar_js_url="/scalar/api-reference.js",
        scalar_favicon_url=BLANK_FAVICON,
        with_default_fonts=False,
        telemetry=False,
        theme=Theme.DEFAULT,
        custom_css=NO_EXTERNAL_LINKS_CSS,
    ).body.decode("utf-8")
    return html.replace("</body>", RETURN_BANNER + "</body>", 1)


router = APIRouter(tags=["Docs"])


@router.get("/scalar", include_in_schema=False)
async def scalar_ui() -> HTMLResponse:
    """Scalar API documentation — self-hosted, dark-mode-capable UI."""
    return HTMLResponse(_scalar_page_html())


@router.get("/scalar/api-reference.js", include_in_schema=False)
async def scalar_js() -> FileResponse:
    """Locally served Scalar JavaScript (no external CDN)."""
    return FileResponse(
        SCALAR_JS_PATH,
        media_type="text/javascript",
        headers={"Cache-Control": "public, max-age=86400"},
    )
