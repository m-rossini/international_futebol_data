# WEB v2.0.0

**Released:** November 08, 2026
**Feature:** StatsBomb section — shot maps & xG

## Changes

- Added `StatsBomb` to the top-level navigation (sidebar, home cards, sitemap),
  driven by the shared `web/src/lib/nav.ts`.
- New `/statsbomb` page — event-data coverage summary (matches with events,
  total events, shots) with StatsBomb Open Data licence attribution.
- Shot-map placeholder notes that shot maps display only for matches with event
  data; all other matches use the score-only Dixon–Coles model.
- Backed by `GET /statsbomb/events` and `GET /statsbomb/shots/{match_id}`.
- 76 web tests pass, lint 0 errors, tsc clean, production build OK.
