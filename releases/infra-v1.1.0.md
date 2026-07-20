# Infra v1.1.0

**Released:** July 20, 2026
**Feature:** Web observability streams now appear in prod/dev OpenObserve

## Changes

- The web (`futebol-web`) image was building with empty `NEXT_PUBLIC_*` values, so the browser telemetry config was null and the `web_events` (logs/metrics) and web `v1/traces` streams never showed up in OpenObserve on prod/dev (only local worked). `NEXT_PUBLIC_OO_*` vars are now passed as Docker **build args** (`web/Dockerfile` + `mk/deploy.mk`) so they are inlined into the prod browser bundle at build time.
- Renamed `NEXT_PUBLIC_OO_*` → `NEXT_PUBLIC_OBS_*` for consistency with the existing `OBS_PROVIDER` / `OBS_PROXY_URL` vars.
- Added `web/src/middleware.ts` to proxy `/api/obs/*` to OpenObserve and inject the Basic auth **server-side**, so admin credentials are never shipped in the client bundle (fixes credential-exposure risk on the public prod site).
- Fixed `scripts/init-observability.sh`: stream creation now uses the correct org path (`/api/default/...` instead of `/api/<user>/...`), so `web_events` is pre-created server-side.
