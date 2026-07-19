# Infra v1.1.0

**Released:** July 19, 2026
**Feature:** Infra Version in Sidebar

## Changes

- Mounted `infra/VERSION` into API dev container at `/app/infra/VERSION`
- Added `--build-context infra=./infra` to production Docker build so the image includes the infra version
- Production Dockerfile now copies `infra/VERSION` into the image via `COPY --from=infra`
