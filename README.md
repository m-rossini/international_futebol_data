# International Football Data

A full‑stack application for exploring international football (soccer) match statistics spanning over 150 years.

**Stack:** FastAPI (Python) + Next.js 15 (TypeScript) + Docker Compose

---

## Attributions

### Data

- **Match results, goalscorers, shootouts, and former country names** sourced from [International Football Results from 1872 to 2025](https://www.kaggle.com/datasets/martj42/international-football-results-from-1872-to-2017) by **Martijn J. van der Ploeg** ([@martj42](https://github.com/martj42)), updated with recent matches.
- **ELO ratings** are calculated on-the-fly from the match results dataset using the standard ELO formula (K=60, home advantage +100, 1872–present). Results are cached to disk for fast reloads. See [`api/football_stats/stats/elo.py`](api/football_stats/stats/elo.py).

### Flags

- **ISO country code flags** (235 SVGs in `web/public/flags/`) sourced from [flag-icons](https://github.com/lipis/flag-icons) by **Panayiotis Lipiridis** ([@lipis](https://github.com/lipis)).
- **Regional, historical, and non-ISO flags** (92 SVGs in `web/public/flags/`) sourced from [Flags of the World](https://www.fotw.info/) and various open‑domain SVG flag projects — created and adapted by the community.

---

## Quick Start

```bash
# Start the full stack (API + Web)
make up

# API:   http://localhost:7531
# Web:   http://localhost:7500
```

```bash
# Stop everything
make down

# Run tests
make test
```

### Prerequisites

- Docker & Docker Compose
- (optional) `make`

### Dataset

The API expects four CSV files in `api/data/`:

| File | Rows | Description |
|---|---|---|
| `results.csv` | ~49,478 | Match results: date, teams, score, tournament, location |
| `goalscorers.csv` | ~47,784 | Scorers per match: date, teams, player |
| `shootouts.csv` | ~678 | Penalty shootout winners |
| `former_names.csv` | 37 | Historical country name mappings |

Additionally, **ELO ratings** (~49,400 rows, 336 teams) are calculated from the match results on first load and cached in `api/data/elo_ratings.pkl` for subsequent reloads.

Mount your data directory in `docker-compose.yml` via the `api` service volume.

---

## API & Interactive Documentation

Since FastAPI auto‑generates an OpenAPI 3.1 spec from the source code, the most accurate API reference is always the live docs:

| URL | Description |
|---|---|
| `http://localhost:7531/scalar` | Scalar — interactive endpoint explorer (self-hosted, no external CDN) |
| `http://localhost:7531/openapi.json` | Raw OpenAPI 3.1 schema |

The FastAPI `app` is configured with `title="International Football Stats"`, `version="1.0.0"`, and full Pydantic response models for every endpoint, so the auto‑generated docs include request parameters, response schemas, and example values — no manual upkeep needed.

### Architecture

```
┌─────────────────────────────────────────────────┐
│  browser  :7500                                 │
│    └─► Next.js App Router (React 19 / TS)       │
│          ├─ /                    Dashboard       │
│          ├─ /teams               500+ team list  │
│          ├─ /head-to-head        Team comparison │
│          ├─ /elo-ranking         ELO Ratings     │
│          └─ /house-keeping        House Keeping   │
│              │                                   │
│              ▼  /api/proxy  (Next.js rewrite)    │
│                                                   │
│  FastAPI  :7531                                  │
│    ├─ GET  /                    Redirect→ /scalar │
│    ├─ GET  /health, /version                     │
│    ├─ GET  /filters, /summary                    │
│    ├─ GET  /teams, /team/:name, /team/:name/matches/:year │
│    ├─ GET  /head_to_head                         │
│    ├─ GET  /top_scorers                          │
│    ├─ GET  /most/:stat                           │
│    ├─ GET  /tournaments, /tournament/:name, /tournament/:name/season/:year │
│    ├─ GET  /countries, /country/:name            │
│    ├─ GET  /cities, /city/:name                  │
│    ├─ GET  /biggest_wins, /goals_per_year        │
│    ├─ GET  /elo-ranking/current                  │
│    ├─ GET  /elo-ranking/history/{team}           │
│    ├─ GET  /elo-ranking/summary                  │
│    └─ POST /reload                               │
│                                                   │
│  OpenObserve  :7580 (UI) / :7581 (ingest)         │
│    ├─ OTLP traces (API auto-instrumentation)     │
│    └─ JSON logs (web client-side events)         │
└─────────────────────────────────────────────────┘
```

## Observability

The stack includes [OpenObserve](https://openobserve.com) for performance monitoring:

- **API tracing** — FastAPI is auto-instrumented with OpenTelemetry. Every request generates traces and spans sent via OTLP to OpenObserve. Includes request duration, status codes, and exceptions.
- **Web analytics** — Client-side page views, API call durations, and errors are batched and sent to OpenObserve's JSON ingestion API.
- **Dashboards** — Pre-built dashboards for application overview, API performance, user experience, and user activity.

OpenObserve UI is available at **http://localhost:7580** (credentials: `admin@futebol.local` / `Futebol@123`).

### Dashboards

Four pre-built dashboards live in [`dashboards/`](dashboards/):

| Dashboard | Panels | Tabs | Description |
|---|---|---|---|
| `01_application_overview.json` | 13 | 2 | Page views, API calls, latency, web vitals, trace activity |
| `02_api_performance.json` | 12 | 2 | Per-endpoint latency, error rates, server logs |
| `03_user_experience.json` | 12 | 2 | Core Web Vitals (CLS, LCP, FCP, TTFB, FID), page load timings |
| `04_user_activity.json` | 10 | 1 | Team selections, filter changes, navigation patterns |

#### Import dashboards

```bash
python scripts/import_dashboards.py
```

The script:
1. Creates each dashboard via `POST /api/{org}/dashboards`
2. Populates panels via `PUT /api/{org}/dashboards/{id}?hash={hash}`
3. Uses the v8 dashboard schema with custom SQL queries

Run it after `make up` — dashboards appear immediately in the OpenObserve UI under **Dashboards**.

> **Note:** If dashboards already exist (same title), the script updates them in-place. To start fresh, delete them from the UI first.

### Key Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Redirects to Scalar API docs (`/scalar`) |
| `GET` | `/health` | Health check for container probes |
| `GET` | `/version` | Current application version |
| `GET` | `/filters` | Distinct values for UI dropdowns (teams, tournaments, countries, cities) |
| `POST` | `/reload` | Reload all data from disk (optional `?force_elo_recalc=true`) |
| `GET` | `/summary` | Global stats (matches, goals, home advantage) |
| `GET` | `/teams` | Full team list with aggregate stats |
| `GET` | `/team/{name}` | Per‑team stats with goal distributions |
| `GET` | `/team/{name}/matches/{year}` | Team matches for a specific year |
| `GET` | `/head_to_head?team1=&team2=` | Head‑to‑head comparison |
| `GET` | `/top_scorers?top_n=20` | Player goal leaderboard (no filter support) |
| `GET` | `/most/{stat}` | Rankings by `wins`, `losses`, `draws`, `goals_for`, `goals_against`, `win_rate`, `loss_rate`, `matches`, `country`, `city` |
| `GET` | `/tournaments` | Tournament list with editions and stats |
| `GET` | `/tournament/{name}` | Single tournament detail with yearly breakdown |
| `GET` | `/tournament/{name}/season/{year}` | Single edition of a tournament |
| `GET` | `/countries` | Country list with match/team counts |
| `GET` | `/country/{name}` | Single country detail |
| `GET` | `/cities` | City list with match counts |
| `GET` | `/city/{name}` | Single city detail |
| `GET` | `/biggest_wins?top_n=10` | Matches with largest goal margins |
| `GET` | `/goals_per_year?sort_by=goals` | Yearly goal/match breakdown |
| `GET` | `/elo-ranking/current?top_n=50` | Current ELO ratings (calculated from match results) |
| `GET` | `/elo-ranking/history/{team}` | Historical ELO rating for a specific team |
| `GET` | `/elo-ranking/summary` | ELO summary statistics (min, max, mean, median, top 10) |

#### Common filter parameters

All endpoints except `/health`, `/version`, `/filters`, `/top_scorers`, and `/reload` accept the same reusable filter query params:

| Parameter | Type | Description |
|---|---|---|
| `teams` | `list[str]` (repeatable) | Filter by team name |
| `tournaments` | `list[str]` (repeatable) | Filter by tournament name |
| `countries` | `list[str]` (repeatable) | Filter by host country |
| `date_from` | `str` (YYYY-MM-DD) | Start date (inclusive) |
| `date_to` | `str` (YYYY-MM-DD) | End date (inclusive) |

**Example:** `?tournaments=FIFA+World+Cup&countries=Brazil&date_from=2000-01-01&date_to=2020-12-31`

Filter semantics: **OR** within each parameter, **AND** across parameters — e.g., `tournaments=Friendly&countries=Germany,Italy` returns friendlies *that were hosted in Germany or Italy*.

---

## Project Structure

```
├── docker-compose.yml        Full stack orchestration
├── Makefile                  Standalone dev commands
├── api/                      FastAPI backend
│   ├── football_stats/       Source code (server, routers, stats engine)
│   │   ├── stats/
│   │   │   ├── elo.py        ELO rating calculation engine (with disk cache)
│   │   │   ├── loader.py     Dataset loading (results, ELO, etc.)
│   │   │   ├── state.py      Global application state
│   │   │   └── ...
│   │   ├── routers/
│   │   │   ├── rankings.py   ELO + comparative endpoints
│   │   │   └── ...
│   ├── tests/
│   │   ├── test_elo_ranking.py      15 tests
│   │   └── ...
│   ├── data/                 Dataset directory (4 CSV files + ELO cache)
│   │   ├── .gitignore        Tracks CSVs, ignores originals
│   │   └── ...
│   ├── Dockerfile
│   └── pyproject.toml
└── web/                      Next.js frontend
    ├── src/app/
    │   ├── elo-ranking/            ELO Ratings page
    ├── src/components/
    │   ├── shared/DownloadButton.tsx  CSV export component
    │   └── ...
    ├── Dockerfile
    └── package.json
├── dashboards/               OpenObserve dashboard definitions (JSON)
├── .github/workflows/        CI pipeline (runs tests on push)
└── scripts/                  Utility scripts (dashboard import, etc.)
```

## Versioning

API and WEB have independent version numbers since they can be deployed separately.

| Component | Version Source | Format |
|-----------|---------------|--------|
| API | `api/config.json` | `MAJOR.MINOR.PATCH` |
| WEB | `web/src/lib/version.ts` | `MAJOR.MINOR.PATCH` |

The sidebar displays both versions: `API v1.0.6 · WEB v1.2.3`

### Manual Version Bumps

Use `make` targets to bump versions manually:

```bash
# Bump API only
make bump-api-patch    # 1.0.6 → 1.0.7
make bump-api-minor    # 1.0.6 → 1.1.0
make bump-api-major    # 1.0.6 → 2.0.0

# Bump WEB only
make bump-web-patch    # 1.0.6 → 1.0.7
make bump-web-minor    # 1.0.6 → 1.1.0
make bump-web-major    # 1.0.6 → 2.0.0

# Bump both together
make bump-both-patch   # Both: 1.0.6 → 1.0.7
make bump-both-minor   # Both: 1.0.6 → 1.1.0
make bump-both-major   # Both: 1.0.6 → 2.0.0
```

### Automatic Version Bumps

A GitHub Actions workflow (`.github/workflows/bump-version.yml`) automatically bumps the **patch** version on PR merge based on which files changed:

- Changes in `api/` → API version bumps
- Changes in `web/` → WEB version bumps
- Changes in both → Both versions bump

The workflow commits directly to `main` with the message `chore: bump version [skip-bump]`.

**Skip auto-bump:** Add `[skip-bump]` to the PR title to prevent automatic version bumping.

### Version Files

| File | Purpose |
|------|---------|
| `api/config.json` | API version source (read at runtime by `/version` endpoint) |
| `web/src/lib/version.ts` | WEB version (build-time constant displayed in sidebar) |
| `scripts/bump_version.py` | Bump script (supports `api`, `web`, `both` targets) |

---

## Development

See individual READMEs for detailed development workflows:
- [`api/README.md`](api/README.md)
- [`web/README.md`](web/README.md)
