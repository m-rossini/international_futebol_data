# API v1.5.0

**Released:** November 07, 2026
**Feature:** Paginated tournament match list + confederation OpenAPI schemas

## Changes

- Added `GET /tournament/{tournament_name}/matches` — paginated match list for a
  tournament, newest first. Query params: `year` (optional edition filter),
  `limit` (1–200, default 50), `offset`. Returns `total`, `limit`, `offset`
  and the match page with date, teams, score, city, country, neutral flag and
  tournament.
- Added `ConfederationListItem`, `ConfederationDetailResponse`,
  `ConfederationMatchItem`, `ConfederationMatchesResponse` response models so
  the confederation endpoints publish real OpenAPI schemas (fixes the empty
  schema test for `/confederations`, `/confederation/{name}` and
  `/confederation/{name}/matches`).
- `SeasonMatchItem` now carries `neutral` and `tournament` fields.
- `tournament_matches` lives in `stats/analysis/tournament.py` and is exposed
  through `Engine.tournament_matches()`.
- 372 API tests pass (6 new tournament-matches tests), ruff clean, mypy clean.
