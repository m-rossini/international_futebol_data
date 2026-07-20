# Infra v1.0.5

**Released:** July 20, 2026
**Feature:** Self-hosted Scalar API Docs

## Changes

- Removed the built-in Swagger UI (`/docs`) and ReDoc (`/redoc`) — Scalar now provides the single interactive API reference.
- Replaced the hand-rolled `/scalar` page with `scalar-fastapi`, self-hosting the Scalar JavaScript from `/scalar/api-reference.js` (vendored into the repo, no external CDN).
- Disabled external links in the docs page: no CDN script, no Google-fonts CDN, inline blank favicon, telemetry off, and Scalar's `scalar.com` branding links hidden.
- Added a floating **"← Back to site"** button on `/scalar` linking to the web app root.
- Root `/` now redirects to `/scalar` (was `/docs`).
- Nginx (local, dev, prod) now proxies `/scalar/` so the self-hosted asset is reachable behind the gateway.
