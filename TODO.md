# TODO

- [ ] Pre-populate filter dropdowns (tournaments, countries, cities) with cached data
- [ ] Tournament detail: make seasons clickable to drill into season details

---

## Done

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