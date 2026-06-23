# TODO

- [x] 1 - Tournament detail: 
    - [x] make seasons clickable to drill into season details
    - [x] Draw Rate is Wrong — was returning per-team dict instead of scalar int (variable shadowing bug)
    - [x] Remove Filter by Tournament — now passes `showTournaments={false}`
- [x] 2 - Country list
    - [x] Add win_rate & loss_rate columns (backend + frontend)
    - [x] Add sort chips (Matches, Win Rate, Loss Rate, Goals, Cities, First/Last Year)
    - [x] Hide the countries filter from countries page and country detail page
- [x] 3 - Cities list
    - [x] Multi-category top teams tabs (by wins, losses, draws, goals for, goals against, goal diff) on city detail page
    - [x] Same multi-category top teams on country detail page
    - [x] Backend: GeographyStats.info() now computes per-team stats for all categories
    - [x] Hide countries filter on city detail page
- [x] Dashboard:
    - [x] Multi-category top teams tabs (wins, losses, draws, goals for, goals against)
- [x] Fixes:
    - [x] Tournament detail hides tournament filter ✅
    - [x] Country detail hides countries filter ✅
    - [x] City detail hides countries filter ✅
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