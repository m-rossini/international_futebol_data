# WEB v1.9.0

**Released:** November 07, 2026
**Feature:** Squads section

## Changes

- Added `Squads` to the top-level navigation (sidebar, home cards, sitemap)
  between Players and Countries, driven by the shared `web/src/lib/nav.ts`.
- New `/squads` page — matches that have squad data, with date and team links.
- New `/squads/[matchDate]/[homeTeam]/[awayTeam]` page — both teams' XI and
  bench with shirt numbers, position, starter flag and captain flag.
- Backed by the new `GET /squads` and `GET /squads/{date}/{home}/{away}`
  API endpoints.
- 76 web tests pass (0 errors), lint clean, tsc clean, production build OK.
