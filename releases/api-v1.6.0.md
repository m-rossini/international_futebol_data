# API v1.6.0

**Released:** November 07, 2026
**Feature:** Country → cities geography endpoint

## Changes

- Added `GET /country/{country_name}/cities` — paginated list of cities where
  matches have been played in a country, each with match count, goals,
  wins/draws and year range. Query params: `limit` (1–200, default 50),
  `offset`, plus the usual filters (`tournaments`, `date_from`, `date_to`).
  Unknown countries return an error dict.
- The country detail (`/country/{name}`) already returns `top_cities`; the new
  endpoint exposes the full city list.
- 376 API tests pass (4 new country-cities tests), ruff clean, mypy clean.
