# WEB v3.0.0

**Released:** November 08, 2026
**Feature:** Major platform version — players, squads, StatsBomb, former names

## Changes

Major release consolidating all navigation, data, and feature work since v2.0.0:

- Single navigation config (`web/src/lib/nav.ts`) drives sidebar, home cards, and sitemap
- New pages: `/players`, `/player/[name]`, `/squads`, `/squads/[date]/[home]/[away]`
- New page: `/statsbomb` — event-data coverage summary with shot-map placeholder
- New page: `/former-names` — sortable table of defunct nation name chains
- New pages: `/countries`, `/country/[name]`, `/cities`, `/city/[name]` (geography section)
- `/about` now credits all data sources with links and licences, plus a live data stamp
- MatchTable city/country cells link to detail pages
- Rate-limit abuse-notice banner on the home page (dismissible, localStorage)
- Every page reachable from navigation — no remembered addresses

76 web tests pass, lint 0 errors, tsc clean, production build OK.
