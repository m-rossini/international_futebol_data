# API v0.0.2

**Released:** June 19, 2026
**Feature:** API Core

## Changes

- Converted to FastAPI stats server with query engine and logging
- Added full test suite (145 tests) and updated goals_per_year with sort params
- Added pytest/httpx to dev deps and auto-install before tests
- Added filter system with empty-data safety and accent-insensitive matching
- Added /health and /version endpoints with tests
- Refactored monolithic analysis.py into analysis/ package (11 modules)
- Split test_server.py into per-endpoint test files
- Grouped endpoints into correlated routes
- Added seasons to tournaments
