# API v2.0.0

**Released:** November 08, 2026
**Feature:** StatsBomb Open Data events — shot maps & xG

## Changes

- Added `GET /statsbomb/events` — StatsBomb event coverage summary (matches with
  events, total events, shots).
- Added `GET /statsbomb/shots/{match_id}` — shot events for a specific match,
  with x/y/xg for shot maps and xG timelines.
- Added `StatsBombShot`, `StatsBombShotsResponse`, `StatsBombEventsResponse`
  response models; `/statsbomb/*` appears in OpenAPI.
- StatsBomb event files live in optional `data/events/` (Parquet/JSONL); loads
  empty if absent, so deployments without StatsBomb data are unaffected.
- StatsBomb Open Data licence: non-commercial, attribution required.
- 390 API tests pass, ruff clean, mypy clean.
