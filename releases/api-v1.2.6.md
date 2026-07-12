# API v1.2.6

**Released:** July 12, 2026
**Feature:** Observability Initialization

## Changes

- Fixed production Dockerfile CMD to use `opentelemetry-instrument` wrapper
- API now exports traces/metrics to OpenObserve on startup
