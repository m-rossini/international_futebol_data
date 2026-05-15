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
    && rm -rf /var/lib/apt/lists/*

# Install dev dependencies
RUN uv sync

# Copy the rest of the application
COPY . .

# Expose port (default 7531 and 5678 for debugpy)
EXPOSE 7531 5678

# Run with debugpy for VS Code attachment
CMD ["uv", "run", "python", "-m", "debugpy", "--listen", "0.0.0.0:5678", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "7531", "--reload"]

# Production stage
FROM base AS production

# Copy the application code
COPY . .

# Expose port
EXPOSE 7531

# Run the application
CMD ["uv", "run", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "7531"]
