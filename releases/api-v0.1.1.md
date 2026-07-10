# API v0.1.1

**Released:** June 30, 2026
**Feature:** Cache System

## Changes

- Added precomputed DataFrame cache with disk persistence
- Updated query engine to use cached DataFrames
- Fixed: handle read-only filesystem for disk cache
- Fixed: cache was never used — FilterParamsDep always returns non-None
- Added source=cache|live to list endpoint debug logs
- Added structured log extras — source=cache|live as attribute
