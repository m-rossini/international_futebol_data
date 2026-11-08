# API v2.1.0

**Released:** November 08, 2026
**Feature:** Former names / defunct nations

## Changes

- Added `GET /former-names` — lists current → former team name chains with
  date ranges (from `former_names.csv`): e.g. USSR → Russia, Yugoslavia →
  Serbia, Gold Coast → Ghana, Czechoslovakia → Czech Republic/Slovakia.
- Added `FormerNamesResponse` and `FormerNameItem` response models.
- `FormerNamesResponse` exposes `total` count and `chains` array.
- 393 API tests pass (3 new former-names tests), ruff clean, mypy clean.
