# WEB v1.8.0

**Released:** November 07, 2026
**Feature:** Players section

## Changes

- Added `Players` to the top-level navigation (sidebar, home cards, sitemap)
  between Teams and Countries, driven by the shared ``web/src/lib/nav.ts``.
- New `/players` page — all goalscorers with goals, matches, teams and career
  span, sortable table.
- New `/player/[name]` page — player summary (goals, matches, teams, career,
  tournaments), top teams by goals, career-by-year table.
- Backed by the new `GET /players` and `GET /player/{name}` API endpoints.
- 76 web tests pass, lint 0 errors, tsc clean, production build OK.
