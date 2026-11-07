# API v1.4.0

**Released:** October 26, 2026
**Feature:** Dixon–Coles Monte Carlo match simulation + confederations dimension

## Changes

- Added `GET /simulate` — Dixon–Coles bivariate Poisson fit with Monte Carlo
  match simulation between any two teams. Query params: `team1`, `team2`,
  `n_simulations`, `use_elo`, `half_life_years`, plus optional filters.
  Returns win/draw/loss probabilities, expected goals and a score histogram.
  `n_simulations` is clamped to [100, 100000].
- Added `scipy>=1.13.0` dependency (Dixon–Coles parameter optimisation).
- Added per-tournament-type ELO K-factors (World Cup 60, continental 50,
  qualifier 40, other 30, friendly 20) alongside the global K=60.
- Added the FIFA confederations dimension: `GET /confederations` lists all six
  confederations with member countries and team counts; `GET
  /confederation/{name}` returns summary stats; `GET
  /confederation/{name}/matches` returns the match list.
- Confederation detail and year pages now fetch server-side and handle unknown
  entities gracefully.
- Every documented endpoint now publishes a real OpenAPI response schema
  (no empty schemas), fixing the `/openapi.json` validation test.
- ELO filtered requests no longer evict the full-history cache; ELO filter
  returning nothing now yields 400 instead of 503.

## Impact

Walk-forward validation on 25,879 matches: Brier 0.5151, LogLoss 0.8763,
Accuracy 59.5%. 348 API tests pass, ruff clean, mypy clean.
