# WEB v1.3.1

**Released:** July 12, 2026

## Changes

- Fixed team link in decade leaders page
- Fixed HTTP 500 error on year 2026 detail page (NaN scores on future matches)
- Added SEO metadata, social sharing tags, and structured data
- Added OpenRouter, Cerebras, and GitHub Models LLM providers with auto-failover
- Wired DEEPSEEK_API_KEY through docker-compose for all environments
- Renamed nginx configs and switched local/dev to subdomains
- Deploy correct .env per target instead of placeholder template
