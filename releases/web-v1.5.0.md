# WEB v1.5.0

**Released:** November 07, 2026
**Feature:** Single navigation config, credited data sources, match lists on tournament/season pages

## Changes

- Added `web/src/lib/nav.ts` — a single source of truth for top-level
  navigation. Sidebar, home page cards and `sitemap.ts` all consume
  `NAV_ITEMS`, so they can no longer drift apart. Home cards now match the
  sidebar (9 entries: Teams, Tournaments, Confederations, Years, Head to Head,
  ELO Rankings, Decade Leaders, Ask Me, House Keeping).
- Added `nav.test.tsx` asserting home cards and sidebar expose the same hrefs.
- About page now credits every data source with a link and licence:
  `international_results` (CC0 1.0), RSSSF, Wikipedia (CC BY-SA 4.0),
  Dixon & Coles (1997), plus StatsBomb, OpenFootball and Wikidata marked as
  planned. Added a live data stamp (data-through date and match/team/country/
  city counts fetched from the API).
- Tournament page ordering: Host Countries → Team Standings → Seasons →
  Matches, with a new paginated Matches list (Previous/Next, count banner).
- Season page: Matches now render above Standings with a match count and an
  explicit empty state.
- 76 web tests pass (6 new), lint 0 errors, tsc clean, production build OK.
