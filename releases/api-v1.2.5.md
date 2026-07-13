# API v1.2.5

**Released:** July 12, 2026

## Changes

- Consolidated LLM provider config into single source (`api/football_stats/config.json`)
- Added free LLM providers: OpenRouter, Cerebras, GitHub Models with auto-failover
- Removed duplicate dead `llm` section from `api/config.json`
- Fixed `bump_version.py` to preserve non-version keys when bumping
