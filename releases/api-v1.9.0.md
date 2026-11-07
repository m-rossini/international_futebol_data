# API v1.9.0

**Released:** November 07, 2026
**Feature:** Squad lineups per match

## Changes

- Added `GET /squads` — paginated list of matches that have squad data,
  newest first, with `limit`/`offset` pagination.
- Added `GET /squads/{match_date}/{home_team}/{away_team}` — squad detail for
  a match: both teams' XI and bench with shirt numbers, position, starter flag
  and captain flag.
- Added `api/data/squads.csv` — curated squad data (World Cup 2022 matches
  seeded). Loads empty if absent from `DATA_DIR`, so deployments without it are
  unaffected.
- Added `SquadMatchItem`, `SquadDetailResponse`, `SquadTeam`, `SquadPlayer`
  response models; `/squads` appears in OpenAPI.
- Squads added to `DataState` (loaded with the rest of the CSV data; counts
  surfaced in `/reload`).
- 390 API tests pass (4 new squad tests, skip when squads.csv absent), ruff
  clean, mypy clean.
