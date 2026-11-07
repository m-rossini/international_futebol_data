# WEB v1.6.0

**Released:** November 07, 2026
**Feature:** Country and city geography section

## Changes

- Added `Countries` to the top-level navigation (sidebar, home cards and
  sitemap all driven by `web/src/lib/nav.ts`), between Tournaments and
  Confederations.
- New `/countries` page — all countries with match counts, goals, cities and
  year range, sortable table with flags.
- New `/country/[name]` page — country summary stats plus top host cities,
  linked to city pages.
- New `/cities` page — all cities with match counts, goals and country links.
- New `/city/[name]` page — city match stats (wins/draws/goals/avg, teams,
  tournaments).
- New API endpoint `GET /country/{name}/cities` backs the country page city
  list.
- 76 web tests pass, lint 0 errors, tsc clean, production build OK.
