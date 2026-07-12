# ── Base: uv binary only ──
FROM python:3.14-slim-bookworm AS base
WORKDIR /app
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# ── Prod deps: minimal sync for production artifact ──
FROM base AS deps
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev

# ── Development: full install with dev tools ──
FROM base AS development
COPY pyproject.toml uv.lock* ./
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl procps make \
    && rm -rf /var/lib/apt/lists/*
RUN uv sync
COPY . .
EXPOSE 7531 5678
CMD ["uv", "run", "python", "-m", "debugpy", "--listen", "0.0.0.0:5678", "football_stats/server.py", "--host", "0.0.0.0", "--port", "7531"]

# ── Production: minimal image, no uv, no dev tools ──
FROM python:3.14-slim-bookworm AS production
WORKDIR /app
COPY --from=deps /app/.venv /app/.venv
COPY --from=releases . /app/releases/
COPY . .
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH="/app"
EXPOSE 7531
CMD ["opentelemetry-instrument", "python", "football_stats/server.py", "--host", "0.0.0.0", "--port", "7531"]
