# API v1.2.3

**Released:** July 10, 2026
**Feature:** PR #22 — Container Startup Optimization

## Changes

- Reduced API startup time from ~2min to ~10s by fixing healthcheck timing
- Precomputed caches now save to writable directory instead of read-only /data
- Reduced Docker image size by removing unnecessary apt packages
- Consolidated redundant uv sync stages in Dockerfile
- Updated .dockerignore to reduce build context
