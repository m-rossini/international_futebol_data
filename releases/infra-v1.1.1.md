# Infra v1.1.1

**Released:** October 12, 2026
**Feature:** All four OpenObserve dashboards now populate with data

## Changes

- `web/Dockerfile`: declared `ARG`/`ENV OBS_BASIC_AUTH` in the **production** stage as well as the build stage. The production stage starts a fresh `FROM`, so the running standalone server previously saw an empty credential — every `/api/obs` telemetry ingest returned `401` on the deployed environments and the dashboards silently stayed empty. Declared without a default so the image carries no secret.
- `docker-compose.yml` / `docker-compose.vps-internal.yml`: supply `OBS_BASIC_AUTH` (and `OBS_PROXY_URL`) at **runtime** rather than baking them into the image, so rotating the password needs only a redeploy instead of an image rebuild.
- Removed the `/api/obs` rewrite from `web/next.config.ts`. Next.js rewrites run *before* route handlers and cannot add an `Authorization` header, so the rewrite was shadowing the server-side proxy and forcing every ingest to `401`.
- Replaced the Edge-runtime `web/src/middleware.ts` proxy with a Node-runtime route handler at `web/src/app/api/obs/[...path]/route.ts`. The middleware streamed `request.body` with `duplex: 'half'` in the Edge runtime, which failed outright (`fetch failed`) even when the credential was valid.

## Impact

`web_events` had **zero rows**; 46 of the 47 queries across the four dashboards read from that stream. Ingest now returns `200` and all **47/47** dashboard queries execute successfully (previously 23/47).

Verified on both local and the internal VPS (`boyz@192.168.1.198`).
