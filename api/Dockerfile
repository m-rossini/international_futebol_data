# Base stage
FROM python:3.14-slim-bookworm AS base

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Copy dependency files
COPY pyproject.toml uv.lock* ./

# Install dependencies (using uv)
RUN uv sync --no-dev

# Development stage
FROM base AS development

# Install diagnostic and network tools + make
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    iputils-ping \
    net-tools \
    vim \
    telnet \
    htop \
    procps \
    make \
    && rm -rf /var/lib/apt/lists/*po

# Install dev dependencies
RUN uv sync

# Copy the rest of the application
COPY . .

# Expose port (default 7531 and 5678 for debugpy)
EXPOSE 7531 5678

# Run with debugpy for VS Code attachment
CMD ["uv", "run", "python", "-m", "debugpy", "--listen", "0.0.0.0:5678", "football_stats/server.py", "--host", "0.0.0.0", "--port", "7531"]

# Production stage — minimal image, no uv, no dev tools
FROM python:3.14-slim-bookworm AS production

WORKDIR /app

# Copy only the virtualenv from the base stage (no uv, no pip, no build tools)
COPY --from=base /app/.venv /app/.venv

# Copy application code
COPY . .

# Activate the venv
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH="/app"

EXPOSE 7531

CMD ["python", "football_stats/server.py", "--host", "0.0.0.0", "--port", "7531"]
