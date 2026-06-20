# International Football Data — API

FastAPI server providing REST statistics over international football match data (1872–present).

**Python 3.14+ · FastAPI · Pandas · Uvicorn · uv**

---

## Quick Start (Docker)

```bash
# From repository root:
make up          # Start full stack (api + web)
make api-build   # Build API image only
make api-up      # Start API dev container (sleep mode)
make api-run     # Start server inside container
```

API runs on **http://localhost:7531** (health check at `/health`).

---

## Quick Start (Local)

```bash
cd api
uv sync
uv run python football_stats/server.py --host 0.0.0.0 --port 7531
```

Requires a `results.csv` dataset file. Place it in `api/data/` or symlink it there.

---

## Endpoints

### Meta
| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Server info |
| `GET` | `/health` | Health check (`{ status, data_loaded }`) |
| `GET` | `/version` | Software version |
| `POST` | `/reload` | Reload data from disk |

### Matches & Summary
| Method | Path | Description |
|---|---|---|
| `GET` | `/summary` | Global statistics (matches, goals, home advantage, goal distribution) |
| `GET` | `/biggest_wins` | Matches with largest goal margins (`?top_n=10`) |
| `GET` | `/goals_per_year` | Yearly goals/matches breakdown (`?sort_by=goals&order=desc`) |

### Teams
| Method | Path | Description |
|---|---|---|
| `GET` | `/team/{name}` | Per‑team stats with goal distributions |
| `GET` | `/head_to_head?team1=&team2=` | Head‑to‑head comparison between two teams |
| `GET` | `/top_scorers` | Player goal leaderboard (`?top_n=20`) |

### Rankings
| Method | Path | Description |
|---|---|---|
| `GET` | `/most/{stat}` | Top‑N ranking by stat (`?top_n=20`) |

**Valid stats:** `wins`, `losses`, `draws`, `goals_for`, `goals_against`, `win_rate`, `loss_rate`, `matches_played`

### Tournaments
| Method | Path | Description |
|---|---|---|
| `GET` | `/tournaments` | List all tournaments |
| `GET` | `/tournament/{name}` | Tournament detail with yearly breakdown |

### Countries
| Method | Path | Description |
|---|---|---|
| `GET` | `/countries` | List all countries with stats |
| `GET` | `/country/{name}` | Country detail (teams, cities, tournaments) |

### Cities
| Method | Path | Description |
|---|---|---|
| `GET` | `/cities` | List all cities with stats |
| `GET` | `/city/{name}` | City detail (teams, tournaments) |

---

## Filtering

Most list endpoints accept optional query parameters:

```
?tournaments=FIFA World Cup&tournaments=Copa América
&countries=Brazil&countries=Argentina
&date_from=2000-01-01
&date_to=2020-12-31
```

---

## Development

### Project Structure
```
api/
├── football_stats/
│   ├── server.py          FastAPI app, lifespan, middleware
│   ├── routers/           Route handlers by domain
│   │   ├── meta.py        /, /health, /version, /reload
│   │   ├── teams.py       /team, /head_to_head, /top_scorers
│   │   ├── matches.py     /summary, /biggest_wins, /goals_per_year
│   │   ├── rankings.py    /most/{stat}
│   │   ├── tournaments.py /tournaments
│   │   ├── countries.py   /countries
│   │   ├── cities.py      /cities
│   │   └── dependencies.py Shared state & query helpers
│   └── stats/             Query engine & data loading
├── tests/                 Pytest test suite
├── data/                  Dataset directory (symlink or copy)
├── Dockerfile
├── pyproject.toml
└── uv.lock
```

### Running Tests

```bash
# Via Make (containerized)
make api-test       # Run pytest
make api-test-cov   # With coverage report

# Locally
cd api
uv run pytest tests/ -v
uv run pytest tests/ -v --cov=football_stats --cov-report=term-missing
```

### Debugging

The API container exposes port `5678` for VS Code debugpy. Set `debugpy` in your dev dependencies and configure VS Code to attach to `localhost:5678`.

### API Docs

When the server is running, interactive docs are available at:
- Swagger UI: http://localhost:7531/docs
- ReDoc: http://localhost:7531/redoc
