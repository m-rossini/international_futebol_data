# WEB v2.1.0

**Released:** November 08, 2026
**Feature:** Former Names section — defunct nations

## Changes

- Added `Former Names` to the top-level navigation (sidebar, home cards,
  sitemap), driven by the shared `web/src/lib/nav.ts`.
- New `/former-names` page — sortable table of all current → former name
  chains with date ranges. Click a former name to navigate to that team's
  page.
- Backed by the new `GET /former-names` API endpoint.
- 76 web tests pass, lint 0 errors, tsc clean, production build OK.
