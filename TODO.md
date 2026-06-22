# TODO

- [ ] 1 - Tournament detail: 
    - [x] make seasons clickable to drill into season details
    - Draw Rate is Wrong
    - Remove Filter by Tournament, since a tournament is already chosen and selected
- [ ] Country list: Sort by win rate, loss rate
- [ ] Dashboard:
    - Currently top teams is just by wins. It should be by any value such as the one in top teams as in tournaments, it actually should be the same component
- [ ] Fixes:
    - Tournament, Select A tournament Details and the filter shows tournament. It should mnot. I guess the Cpmpoenent could be the same, however the part of tournament selection in it should be hidden.
    - Same as Country details in country page, it goes to a detaul page with  country as a filter when a given country is already previsouly selected.
---

## Done

- [x] Pre-populate filter dropdowns (tournaments, countries, cities) with cached data — FilterDropdown component with telescopic search, GET /filters endpoint
- [x] Add MCP Server (15 tools via FastMCP, stdio+SSE)
- [x] Add OpenObserve to compose (service, volumes, health check)
- [x] Add API tracking (OpenTelemetry auto-instrumentation → OTLP)
- [x] Add web tracking (client-side page views, API call timing, error tracking)
- [x] Add WEB tests (vitest, 49 tests, 5 files)
- [x] Add standalone commands to Makefile
- [x] Create READMEs (root, api, web)
- [x] Fix .gitignore
- [x] Team detail: distribution graph (wins/losses/draws/GF/GC over time) — Nivo ResponsiveLine with metric toggle
- [x] OpenObserve: fix ports (HTTP→5080), auth (Basic), healthcheck (service_started fallback), password strength