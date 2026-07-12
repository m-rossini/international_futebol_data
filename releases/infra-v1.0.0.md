# Infra v1.0.0

**Released:** July 12, 2026
**Feature:** Observability Infrastructure

## Changes

- New `infra/` module for non-API/non-web infrastructure changes
- Added `scripts/init-observability.sh` for OpenObserve stream and dashboard initialization
- Updated `scripts/import_dashboards.py` to accept configurable `--base-url`, `--user`, `--password`
- Fixed MCP command in `docker-compose.vps.yml` and `docker-compose.vps-internal.yml` to use `opentelemetry-instrument`
- Updated `mk/deploy.mk` to run observability init post-deploy
- Updated `scripts/bump_version.py` and `mk/version.mk` to support `infra` module
