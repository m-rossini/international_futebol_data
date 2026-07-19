# Infra v1.0.1

**Released:** July 19, 2026
**Feature:** Nginx API Routing

## Changes

- Added `api_upstream` block to all Nginx configs (local, dev, prod)
- Nginx now proxies `/docs`, `/openapi.json`, `/redoc`, `/health`, and all other API endpoints to the FastAPI backend under the main domain
- `location ~` regex blocks route API traffic before the catch-all `location /` that serves the Next.js frontend
- Frontend routes (`/teams`, `/tournaments`, `/years`, `/head-to-head`, etc.) remain unaffected
