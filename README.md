# International Football Data

A full‑stack application for exploring international football (soccer) match statistics spanning over 150 years.

**Stack:** FastAPI (Python) + Next.js 15 (TypeScript) + Docker Compose

---

## Attributions

### Data

- **Match results, goalscorers, shootouts, and former country names** sourced from [International Football Results from 1872 to 2025](https://www.kaggle.com/datasets/martj42/international-football-results-from-1872-to-2017) by **Martijn J. van der Ploeg** ([@martj42](https://github.com/martj42)), updated with recent matches.
- **FIFA Men's World Rankings (1993–present)** sourced from the [fifa_ranking](https://github.com/tadhgfitzgerald/fifa_ranking) dataset by **tadhgfitzgerald**, a historical archive of official FIFA/Coca-Cola World Rankings with ~57,800 rows covering ~200 countries per monthly snapshot.
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

The API expects five CSV files in `api/data/`:

| File | Rows | Description |
|---|---|---|
| `results.csv` | ~49,478 | Match results: date, teams, score, tournament, location |
| `goalscorers.csv` | ~47,784 | Scorers per match: date, teams, player |
| `shootouts.csv` | ~678 | Penalty shootout winners |
| `former_names.csv` | 37 | Historical country name mappings |
| `fifa_ranking.csv` | ~57,800 | FIFA Men's World Rankings (1993–present) |

Additionally, **ELO ratings** (~49,400 rows, 336 teams) are calculated from the match results on first load and cached in `api/data/elo_ratings.pkl` for subsequent reloads.

Mount your data directory in `docker-compose.yml` via the `api` service volume.

---

## API & Interactive Documentation

Since FastAPI auto‑generates an OpenAPI 3.1 spec from the source code, the most accurate API reference is always the live docs:

| URL | Description |
|---|---|
| `http://localhost:7531/docs` | Swagger UI — interactive endpoint explorer |
| `http://localhost:7531/redoc` | ReDoc — browsable reference |
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
│          ├─ /fifa-ranking        FIFA Rankings   │
│          ├─ /elo-ranking         ELO Ratings     │
│          ├─ /ranking-comparison  FIFA vs ELO     │
│          ├─ /team-ranking-comparison  Timeline   │
│          └─ /flag-report         Missing flags   │
│              │                                   │
│              ▼  /api/proxy  (Next.js rewrite)    │
│                                                   │
│  FastAPI  :7531                                  │
│    ├─ GET  /                    Redirect→ /docs  │
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
│    ├─ GET  /fifa-ranking/current                 │
│    ├─ GET  /fifa-ranking/history/{country}       │
│    ├─ GET  /fifa-ranking/snapshots               │
│    ├─ GET  /elo-ranking/current                  │
│    ├─ GET  /elo-ranking/history/{team}           │
│    ├─ GET  /elo-ranking/summary                  │
│    ├─ GET  /ranking-comparison                   │
│    ├─ GET  /ranking-comparison/{team}            │
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
| `GET` | `/` | Redirects to Swagger UI (`/docs`) |
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
| `GET` | `/fifa-ranking/current?top_n=50` | Current FIFA World Ranking (latest snapshot) |
| `GET` | `/fifa-ranking/history/{country}` | Historical FIFA ranking for a specific country |
| `GET` | `/fifa-ranking/snapshots` | List all available FIFA ranking snapshot dates |
| `GET` | `/elo-ranking/current?top_n=50` | Current ELO ratings (calculated from match results) |
| `GET` | `/elo-ranking/history/{team}` | Historical ELO rating for a specific team |
| `GET` | `/elo-ranking/summary` | ELO summary statistics (min, max, mean, median, top 10) |
| `GET` | `/ranking-comparison?top_n=30` | Compare FIFA World Rankings vs ELO ratings side by side |
| `GET` | `/ranking-comparison/{team}` | FIFA vs ELO timeline for a specific team |

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
│   │   │   ├── loader.py     Dataset loading (results, FIFA ranking, etc.)
│   │   │   ├── state.py      Global application state
│   │   │   └── ...
│   │   ├── routers/
│   │   │   ├── rankings.py   FIFA + ELO + comparative endpoints
│   │   │   └── ...
│   ├── tests/
│   │   ├── test_fifa_ranking.py     13 tests
│   │   ├── test_elo_ranking.py      15 tests
│   │   ├── test_ranking_comparison.py 13 tests
│   │   └── ...
│   ├── data/                 Dataset directory (5 CSV files + ELO cache)
│   │   ├── fifa_ranking.csv  FIFA Men's World Rankings (57,793 rows)
│   │   ├── .gitignore        Tracks fifa_ranking.csv, ignores originals
│   │   └── ...
│   ├── Dockerfile
│   └── pyproject.toml
└── web/                      Next.js frontend
    ├── src/app/
    │   ├── fifa-ranking/           FIFA Rankings page
    │   ├── elo-ranking/            ELO Ratings page
    │   ├── ranking-comparison/     FIFA vs ELO side-by-side page
    │   └── team-ranking-comparison/ Team timeline comparison page
    ├── src/components/
    │   ├── shared/DownloadButton.tsx  CSV export component
    │   └── ...
    ├── Dockerfile
    └── package.json
├── dashboards/               OpenObserve dashboard definitions (JSON)
├── .github/workflows/        CI pipeline (runs tests on push)
└── scripts/                  Utility scripts (dashboard import, etc.)
```

## Development

See individual READMEs for detailed development workflows:
- [`api/README.md`](api/README.md)
- [`web/README.md`](web/README.md)
