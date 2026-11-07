# API v1.8.0

**Released:** November 07, 2026
**Feature:** Player entities derived from goalscorers.csv

## Changes

- Added `GET /players` — paginated list of player entities derived purely from
  ``goalscorers.csv`` (no scraping). Each player: goals, matches (caps), teams,
  first/last year, tournaments. Sorted by goals, paginated with ``limit`` /
  ``offset``.
- Added `GET /player/{name}` — player detail: career by year, top teams by
  goals, tournaments.
- Added `PlayerListItem`, `PlayerDetailResponse`, `PlayerSummary`,
  `PlayerCareerRow` response models so the endpoints publish real OpenAPI
  schemas.
- Derivation is name-based (stable slug id); Wikidata enrichment (DOB,
  position, aliases) is a planned follow-up.
- Added conftest fixture that resets the in-memory rate limiter between tests.
- 389 API tests pass (8 new player tests), ruff clean, mypy clean.
