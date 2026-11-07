# API v1.7.0

**Released:** November 07, 2026
**Feature:** Rate limiting and anti-scraping limits

## Changes

- Added per-IP rate limiting via nginx `limit_req_zone` zones:
  - `static` 30 r/s burst 60 — web pages and assets
  - `api` 5 r/s burst 20 — general REST API
  - `expensive` 6 r/min burst 3 — `/simulate` and `/conversation`
- Added FastAPI middleware second layer (`api/football_stats/ratelimit.py`)
  keyed by client IP (`X-Forwarded-For` behind nginx), returning `429` with
  `Retry-After`. The web container's own IP is exempt so normal browsing is
  not throttled by the app's server-side API proxy.
- `robots.txt` disallows `/api/proxy`, `/docs`, `/openapi.json`, `/redoc`,
  `/scalar/`, `/conversation`, `/house-keeping/`, `/releases/` and
  `/qrcode`; blocks GPTBot, CCBot, ClaudeBot, Bytespider, Amazonbot and
  Google-Extended (`Disallow: /`).
- `X-RateLimit-Group` response header exposes which bucket a request used.
- 376 API tests pass (5 new ratelimit tests), ruff clean, mypy clean.
