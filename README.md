# International Football Data

A full‑stack application for exploring international football (soccer) match statistics spanning over 150 years.

**Stack:** FastAPI (Python) + Next.js 15 (TypeScript) + Docker Compose

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

The API expects a `results.csv` dataset. Mount your data directory in `docker-compose.yml` via the `api` service volume.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  browser  :7500                                 │
│    └─► Next.js App Router (React 19 / TS)       │
│          ├─ /              Dashboard            │
│          ├─ /teams         500+ team list        │
│          ├─ /tournaments   Tournament browser    │
│          ├─ /countries     Country browser       │
│          ├─ /cities        City browser          │
│          ├─ /rankings      Leaders by stat       │
│          ├─ /head-to-head  Team comparison       │
│          ├─ /top-scorers   Player leaderboard    │
│          ├─ /biggest-wins  Largest goal margins  │
│          └─ /goals-per-year  Yearly trends       │
│              │                                   │
│              ▼  /api/proxy  (Next.js rewrite)    │
│                                                   │
│  FastAPI  :7531                                  │
│    ├─ GET  /health                               │
│    ├─ GET  /summary                              │
│    ├─ GET  /team/:name                           │
│    ├─ GET  /head_to_head                         │
│    ├─ GET  /top_scorers                          │
│    ├─ GET  /most/:stat                           │
│    ├─ GET  /tournaments, /tournament/:name       │
│    ├─ GET  /countries, /country/:name            │
│    ├─ GET  /cities, /city/:name                  │
│    ├─ GET  /biggest_wins                         │
│    ├─ GET  /goals_per_year                       │
│    └─ POST /reload                               │
│                                                   │
│  OpenObserve  :5080 (UI) / :5081 (ingest)        │
│    ├─ OTLP traces (API auto-instrumentation)     │
│    └─ JSON logs (web client-side events)         │
└─────────────────────────────────────────────────┘
```

## Observability

The stack includes [OpenObserve](https://openobserve.com) for performance monitoring:

- **API tracing** — FastAPI is auto-instrumented with OpenTelemetry. Every request generates traces and spans sent via OTLP to OpenObserve. Includes request duration, status codes, and exceptions.
- **Web analytics** — Client-side page views, API call durations, and errors are batched and sent to OpenObserve's JSON ingestion API.

OpenObserve UI is available at **http://localhost:5080** (credentials: `admin@futebol.local` / `Futebol@123`).

### Key Endpoints

| Endpoint | Description |
|---|---|
| `/summary` | Global stats (matches, goals, home advantage) |
| `/team/{name}` | Per‑team stats with goal distributions |
| `/head_to_head?team1=&team2=` | Head‑to‑head comparison |
| `/most/{stat}` | Rankings: `wins`, `losses`, `draws`, `goals_for`, `goals_against`, `win_rate`, `matches_played` |
| `/tournaments` | Tournament list with editions and stats |
| `/countries` | Country list with match/team counts |
| `/cities` | City list with match counts |
| `/top_scorers?top_n=20` | Player goal leaderboard |
| `/biggest_wins?top_n=10` | Matches with largest goal margins |
| `/goals_per_year?sort_by=goals` | Yearly goal/match breakdown |

All list endpoints support optional filters: `?tournaments=WC&countries=Brazil&date_from=2000-01-01&date_to=2020-12-31`

---

## Project Structure

```
├── docker-compose.yml        Full stack orchestration
├── Makefile                  Standalone dev commands
├── api/                      FastAPI backend
│   ├── football_stats/       Source code (server, routers, stats engine)
│   ├── tests/                Pytest test suite
│   ├── data/                 Symlink to real dataset
│   ├── Dockerfile
│   └── pyproject.toml
└── web/                      Next.js frontend
    ├── src/app/              Pages (App Router)
    ├── src/components/       Shared UI components
    ├── src/lib/              API client, types, utilities
    ├── public/               Static assets
    ├── Dockerfile
    └── package.json
```

## Development

See individual READMEs for detailed development workflows:
- [`api/README.md`](api/README.md)
- [`web/README.md`](web/README.md)
