# Plan: 002-precompute-list-dataframes — COMPLETE

## Goal

Precompute expensive DataFrame aggregations on startup and cache to disk, so list endpoints return instantly. Use file size as staleness indicator.

## Problem

Every API request to list endpoints (teams, tournaments, countries, cities) runs `enrich_match_results()` + heavy `groupby` aggregations from scratch. With ~49k matches, this is slow on repeated calls.

## Key insight

All list endpoints depend on `enrich_match_results(results)`. This enriched DataFrame adds `year`, `total_goals`, `home_win`, `away_win`, `draw`, `goal_diff`, `winner` columns. Caching it eliminates the most repeated computation.

## Architecture

### Cache structure

On startup (or first request), compute and store in `DataState`:

| Cache key | Source function | Description |
|---|---|---|
| `_cache_enriched` | `enrich_match_results(results)` | Enriched results with derived columns |
| `_cache_teams_list` | `teams_list(enriched)` | Precomputed team aggregates |
| `_cache_tournaments_list` | `tournaments_list(enriched)` | Precomputed tournament aggregates |
| `_cache_countries_list` | `countries_list(enriched)` | Precomputed country aggregates |
| `_cache_cities_list` | `cities_list(enriched)` | Precomputed city aggregates |

### Staleness detection

Store file sizes of all 4 CSVs in `api/data/cache_meta.json`:
```json
{
  "results.csv": 1234567,
  "goalscorers.csv": 234567,
  "shootouts.csv": 3456,
  "former_names.csv": 1234
}
```

On reload, compare current file sizes vs cached. If any differ, recompute. If same, load from disk cache.

### Disk cache files

Store in `api/data/precomputed/`:
- `enriched.pkl`
- `teams_list.pkl`
- `tournaments_list.pkl`
- `countries_list.pkl`
- `cities_list.pkl`
- `cache_meta.json`

## Steps

### Step 1 — Add precomputed cache to DataState

**File:** `api/football_stats/stats/state.py`

- Add cache attributes: `_cache_enriched`, `_cache_teams_list`, `_cache_tournaments_list`, `_cache_countries_list`, `_cache_cities_list`
- Add `_compute_caches()` method that computes all 5 items from `self.results`
- Add `_load_from_disk_cache()` and `_save_to_disk_cache()` methods
- Modify `reload()` to check file sizes, load from disk if valid, else compute and save
- Add `enriched` property that returns the cached enriched DataFrame

**Commit:** `feat: add precomputed DataFrame cache with disk persistence`

### Step 2 — Update engine to use cached data

**File:** `api/football_stats/stats/engine.py`

- `teams()`: return `self._state.cache_teams_list` (no computation needed)
- `tournaments()`: return `self._state.cache_tournaments_list`
- `countries()`: return `self._state.cache_countries_list`
- `cities()`: return `self._state.cache_cities_list`
- `_filtered_results()`: for detail endpoints (team, tournament, etc.), use `self._state.enriched` as base instead of raw results — avoids re-enriching on every detail query
- Keep list endpoints filter-free (they return all items, frontend handles display)

**Commit:** `feat: update query engine to use cached DataFrames`

### Step 3 — Update POST /reload to clear cache

**File:** `api/football_stats/routers/meta.py`

- After `state.reload()`, the cache is already recomputed in `reload()`. No change needed unless we want explicit cache clearing.
- Verify the `/reload` endpoint works correctly with new cache flow.

**Commit:** (verify only, no commit needed unless changes required)

### Step 4 — Validate

- Run `uv run pytest tests/ -v` in `api/`
- Verify list endpoints return same data as before
- Verify `/reload` recomputes cache
- Verify cache files appear in `api/data/precomputed/`

## Files to modify

| File | Action |
|---|---|
| `api/football_stats/stats/state.py` | Modify — add cache logic |
| `api/football_stats/stats/engine.py` | Modify — use cached data |
| `api/football_stats/routers/meta.py` | Verify (likely no changes) |

## Cache flow diagram

```
Startup / POST /reload
  ├── Load CSVs → self.results
  ├── Check cache_meta.json file sizes
  │   ├── Match? → Load .pkl files from disk
  │   └── Mismatch? → Compute enriched + 4 lists → Save to disk
  └── Ready

GET /teams (no filters)
  └── Return self.cache_teams_list (instant)

GET /team/{name} (detail)
  └── Filter self.enriched by team → compute detail (same as before, but no re-enrich)

GET /tournaments (no filters)
  └── Return self.cache_tournaments_list (instant)
```

## Implementation Notes

### Commits
1. `30b5759` — `feat: add precomputed DataFrame cache with disk persistence`
2. `306f616` — `feat: update query engine to use cached DataFrames`
3. `7b1ac2a` — `fix: handle read-only filesystem for disk cache`

### Key design decisions
- **Read-only filesystem**: Docker mounts `/data` as `:ro`. Cache gracefully falls back to in-memory only with a warning log.
- **Staleness detection**: Uses CSV file sizes only (not content hashes) for speed.
- **Detail endpoints**: Use `_enriched_filtered()` which returns the cached enriched DataFrame (avoids re-enriching). List endpoints with filters still compute from raw data.
- **Cache files stored in**: `api/data/precomputed/` (same directory as CSVs)
