# API v3.0.0

**Released:** November 08, 2026
**Feature:** Major platform version — players, squads, StatsBomb, former names

## Changes

Major release consolidating all data and feature work since v2.0.0:

- `GET /players` — paginated list of player entities derived from goalscorers.csv
- `GET /player/{name}` — player detail: career by year, top teams, tournaments
- `GET /squads` — paginated list of matches with squad data
- `GET /squads/{match_date}/{home_team}/{away_team}` — squad detail: XI + bench
- `GET /statsbomb/events` — StatsBomb Open Data coverage summary
- `GET /statsbomb/shots/{match_id}` — shot map data (x/y/xg)
- `GET /former-names` — defunct nation name chains with date ranges
- Rate limiting (nginx `limit_req` + FastAPI middleware), `429` + `Retry-After`
- `robots.txt` hardened: blocks GPTBot, CCBot, ClaudeBot, Bytespider, Amazonbot, Google-Extended
- All endpoints publish real OpenAPI response schemas
- `X-RateLimit-Group` response header exposes the rate-limit bucket

Includes every change from v2.0.0 and v2.1.0 plus the new endpoints above.

393 API tests pass, ruff clean, mypy clean.
