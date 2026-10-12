# WEB v1.3.7

**Released:** October 12, 2026
**Feature:** Page-view telemetry for referrer and navigation dashboards

## Changes

- Added `logPageView(page, referrer, previousPage)` to the `ObservabilityProvider` interface and all three implementations (`openobserve`, `console`, `noop`), plus a `logPageView` export from `web/src/lib/observability.ts`.
- `PageViewTracker` now emits a `page_view` event on every route change. Previously it only started a trace and **never** emitted a `page_view` event, so the "Top Referrers" and "Navigation Flow (Previous → Current)" panels had no data regardless of traffic.
  - `document.referrer` is captured on the first navigation of a session; afterwards `previous_page` carries the origin.
  - Empty strings are normalised to `null` so the dashboards' `referrer is not null and != ''` filters behave correctly.
  - Read in a mount effect rather than during render, per the `react-hooks/refs` lint rule.
- No change needed for `team1`/`team2` ("Head-to-Head Team Pairs") or `filter_key`/`filter_value` ("Filter Usage") — those were already emitted by existing code and only failed because of the infra ingest `401` (see Infra v1.1.1).

## Impact

All **47/47** dashboard queries now execute successfully against OpenObserve (previously 23/47). `pnpm test` 60 passed, lint clean.
