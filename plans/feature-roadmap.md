# Feature & Data Roadmap

Status: agreed plan, M0 ready to start. Decisions settled 2026-11-07.
Owner: Marcos.
Scope: fix the reported UX defects, close the data gaps, add the new sources that are
licence-clean, and put limits on abusive usage.

Sizes: **S** ≤ 1 day · **M** 2–3 days · **L** 1–2 weeks · **XL** > 2 weeks.

---

## 0. Audit — reported defects, root cause, fix

| # | Report | Where | Root cause | Fix | Size |
|---|---|---|---|---|---|
| 1 | Season page shows standings but no match list | `web/src/app/tournaments/[name]/season/[year]/season-detail-client.tsx:200-217` | The API does return `matches_list`, but the page renders Standings first and Matches after, with no anchor, count or empty state — so it reads as "no matches" | Move Matches above Standings; add a match count + anchor; explicit empty state ("no matches for this filter"); keep the season summary cards | S |
| 2 | Tournament page has no match list | `web/src/app/tournaments/[name]/tournament-detail-client.tsx:257` | Only `TeamStandingsTable` + `Host Countries` are rendered | Add a paginated match list for the tournament (all editions, filterable by year) | S |
| 3 | Host countries should come before countries | `tournament-detail-client.tsx:25-85` (yearly columns), `:257-280` (sections) | `host_country` is the last column; the "Host Countries" block sits after standings | Order: **Host(s) → Countries → Teams → Matches…**; move the Host block above standings | S |
| 4 | No country-level menu, should divide into cities | no `/countries` page, no `/country/[name]` route, API has only `/countries`, `/cities`, `/city/{name}` | Country is only a filter value. `Engine.country()` already exists in `api/football_stats/stats/engine.py:287` — only the router + UI are missing | New API `/country/{name}` + `/country/{name}/cities`; new pages `/countries`, `/country/[name]`, `/cities`, `/city/[name]`; add "Countries" to nav | M |
| 5 | Home cards must match the sidebar | `web/src/app/page.tsx:198-252` vs `web/src/components/layout/Sidebar.tsx:23-36` | Two hand-maintained lists: 6 cards vs 9 nav items (missing Confederations, Ask Me, House Keeping) | Single `navConfig` module consumed by Sidebar, home cards, and `sitemap.ts`; add a test asserting parity | S |
| 6 | No women's football | data layer | `results.csv` is men's only; no `gender` dimension anywhere | **Out of scope by decision (2026-11-07)** — revisit later; see B1 | — |
| 7 | Housekeeping missing latest releases | `releases/` (api stops at `api-v1.3.1.md`, web at `web-v1.3.7.md`) | 1.4.0 was bumped without generating notes | Add `api-v1.4.0.md`, `web-v1.4.0.md`; add a CI/Make check that a release note exists for every bumped version | S |
| 8 | Credits to other people's work are missing | `web/src/app/about/page.tsx:104` | Generic paragraph, no links, no licences | Full credits block with links and licences (see A6) | S |
| 9 | Anti-scraping notice + limits | none | No rate limiting anywhere; `robots.txt` is static and permissive | See workstream E | M |
| 10 | Shot maps | — | No event data | StatsBomb ingest, see C2/D3 | L |
| 11 | Squads per match + DOB/age for H2H calibration | — | No player or squad tables | See B3/B4/C3/D2 | L |

---

## 1. Workstream A — Navigation & information architecture

Goal: every entity reachable in one click, one source of truth for navigation, credits that
actually credit.

### A1 — Shared navigation config (S)
- New `web/src/lib/nav.ts` exporting `NAV_ITEMS` (href, label, icon, description).
- `Sidebar.tsx`, `page.tsx` cards and `sitemap.ts` all consume it.
- Test: `nav.test.ts` asserts home cards === sidebar items.
- Accept: no way to add a nav entry without it appearing in both places.

### A2 — Countries section (M)
- API: `GET /country/{name}` → totals, tournaments, host years, cities, top teams;
  `GET /country/{name}/cities` → city rows with match counts.
  `Engine.country()` and `country_info()` already exist — this is mostly a router + models task.
- Web: `/countries` (list with flags + match counts), `/country/[name]` (summary cards,
  tournaments, cities table, matches).
- Nav: add "Countries" under Confederations.
- Accept: Brazil → cities → a city page → matches, all navigable without filters.

### A3 — Cities section (M)
- Web: `/cities` (searchable list), `/city/[name]` (matches, tournaments, teams, map link).
- Accept: city page reachable from country page and from match rows.

### A4 — Tournament detail: matches + ordering (S)
- Column order: `Year → Matches → Goals → Avg Goals → Home → Away → Draws → Teams → Host(s)`.
- Sections: Summary → **Host Countries** → Standings → **Matches**.
- Accept: a tournament page shows a match list without opening a season.

### A5 — Season detail: matches first (S)
- Order: Summary → **Matches** → Standings.
- Accept: match list visible without scrolling past standings.

### A6 — Credits page (S)
Content must include, with links:
- `m-rossini/international_results` — CC0 1.0; upstream: Wikipedia, RSSSF, national FAs.
- `m-rossini/international_futebol_data` — ELO implementation.
- StatsBomb Open Data — StatsBomb Public Data Agreement, attribution + non-commercial.
- OpenFootball — public domain/CC0.
- Wikidata — CC0. Wikipedia — CC BY-SA 4.0 (attribution + share-alike).
- Model: Dixon–Coles (1997) reference.
- "Data as of <date>" stamp fetched from the API.

### A7 — About/last-updated (S)
- Surface `data_last_updated` + counts (matches, teams, tournaments) on `/about`.

---

## 2. Workstream B — Data completeness

### B1 — Women's national teams (deferred, not in scope)
Decision (2026-11-07): no women's football for now. Kept here so the schema is not
painted into a corner:
- When it returns: add `gender` (`men` | `women`) defaulting to `men`, separate ELO pool,
  same page templates with a toggle.
- Nothing in the current milestones depends on it.

### B2 — Completeness of the men's dataset (L)
- Pre-1900 matches, defunct nations (USSR, Yugoslavia, Czechoslovakia, East Germany, Saar,
  Zaire→DR Congo chains), Olympic tournaments, unofficial matches.
- Reuse `former_names.csv`; add a `team_status` (`active` | `defunct`) dimension.
- Accept: a "defunct teams" view; no duplicate team identities.

### B3 — Squads per match (L)

**The honest answer to "can we get squad names for every match in `results.csv`?"**
No single free, licence-clean source covers all 49,945 matches. Squads have to be layered,
and the UI must show coverage per match rather than imply completeness.

| Source | Coverage | Licence | What it gives |
|---|---|---|---|
| OpenFootball (GitHub) | World Cup / Euro finals, recent editions | Public domain / CC0 | Starting XI + bench, shirt numbers, sometimes position |
| Wikipedia match/season articles | Major tournaments and many qualifiers, hand-maintained | CC BY-SA 4.0 | Lineups, coaches, sometimes minutes |
| StatsBomb Open Data | A fixed set of tournaments (WC 2018/22, Women's WC 2019/23, Euro 2020/24, Copa 2024, AFCON 2023) | Public Data Agreement | Full XI + bench + positions + minutes + events |
| Wikidata | **Player metadata only** — no match squads | CC0 | DOB, position, clubs, aliases to join names |
| FBref / Transfermarkt / Sofascore / FotMob | Would cover more | ToS forbids scraping | Blocked |

So: squads for major tournaments (real data), player identity + DOB/age for everyone we can
resolve, and an explicit "lineups not available for this match" state elsewhere.

**Model**
- `match_squads(match_id, team, source, source_url, retrieved_at)`
- `squad_players(match_id, team, player_id, shirt_no, position, starter, minutes, captain)`
- `match_squad_status(match_id, home_status, away_status)` — `full | partial | none`

**Interface (this is the part you asked about)**
- New `/match/[id]` page (stable id from date + teams), linked from every `MatchTable` row.
- Page sections: Score header → **Squads** (two columns: XI / bench, shirt no, position,
  age at match date, caps to date) → Events/goals → Shot map (when StatsBomb exists) →
  Source + licence line.
- On the season/tournament match list, a small badge per row: `Squads ✓` / `Squads —`
  so coverage is visible before clicking.
- On `/head-to-head`, a **Squad panel**: mean age, mean caps, most-capped XI, and a
  "calibration" delta showing how much the squad adjustment moved the probabilities.
- Age is computed from Wikidata DOB; caps are computed from our own appearance data, so they
  improve as more squads are ingested. No DOB → show `—`, never guess.

**Accept:** a 2022 World Cup match shows both squads with ages and caps; a 1974 friendly
shows "lineups not available" with the reason, and still shows the score, scorers and venue.

### B4 — Player entity model (L)
- `players(id, wikidata_qid, name, dob, position, nationality, gender)`.
- `player_appearances(player_id, match_id, team, minutes, goals, assists, cards)`.
- Entity resolution: `goalscorers.csv` scorer strings → `players`, using
  (name, team, date window) + Wikidata alias matching; manual review queue for collisions.
- Accept: ≥ 90 % of scorer rows resolved; a `/players` page exists.

---

## 3. Workstream C — New sources

| Source | Access | Licence | Use | Risk |
|---|---|---|---|---|
| Wikidata | SPARQL bulk | CC0 | Player DOB, position, clubs, aliases | Low |
| OpenFootball | GitHub | Public domain / CC0 | Tournament squads | Low |
| StatsBomb Open Data | GitHub | Non-commercial + attribution | Events, lineups, 360 | Low (licence compliance) |
| Wikipedia | Dumps/API | CC BY-SA 4.0 | Squads, managers, defunct nations, women's | Medium (attribution/share-alike) |
| FBref | Web only | ToS forbids scraping | xG for all matches | **Blocked** |
| Transfermarkt | Web only | ToS forbids scraping | Market values | **Blocked** |
| Sofascore / FotMob / WhoScored / Understat | Unofficial APIs | ToS forbids scraping | Lineups, ratings | **Blocked** |
| Football-Data.co.uk | CSV | Free | Odds (club only) | Low value here |
| API-Football / 5DollarFootballAPI | API | Freemium | — | Excluded by policy |

### C1 — Wikidata pipeline (M)
- `scripts/ingest_wikidata.py`: SPARQL for players with a national-team appearance,
  storing QID, DOB, position, aliases.
- Idempotent, cached raw responses, `data/wikidata/` snapshot committed or fetched in CI.

### C2 — StatsBomb Open Data ingest (L)
- Downloader for the open-data repo; parser to a normalised event table.
- Competitions available (as of the open-data release): WC 2018/2022, Women's WC 2019/2023,
  Euro 2020/2024, Copa América 2024, AFCON 2023, plus club competitions.
- Output: `events`, `shots`, `lineups`, `three_sixty_frames`.
- Attribution required on every page that uses it.

### C3 — OpenFootball ingest (S)
- Squads for World Cup / Euro editions into `match_squads` / `squad_players`.

---

## 4. Workstream D — Model & features

Rule for every item here: **test with the existing walk-forward harness** (Brier / LogLoss),
never assume. Previous screening showed derived features (rest days, congestion, scorer
concentration) do not improve Dixon–Coles; the same standard applies.

### D1 — Players pages (L, depends on B4 + C1)
- `/players` search, `/player/[id]`: career by year, goals, caps, tournaments, clubs.
- Link scorers in `MatchTable` and `top_scorers` to player pages.

### D2 — Squad-aware H2H calibration (M, depends on B3/C3)
- Features: squad mean age, mean caps, share of squad with < 5 caps, key-player absence.
- Evaluate as DC covariates; keep only what improves Brier on the walk-forward set.
- UI: on `/head-to-head`, a "Squads" panel (age, caps, most-capped XI) next to the
  simulation, plus an explicit "calibration" note showing how much the adjustment moved
  the probabilities.

### D3 — Shot maps & xG (L, depends on C2)
- `/match/[id]` shot map; xG timeline; "deserved winner"; keeper save performance.
- Only for competitions present in StatsBomb open data — label coverage explicitly.

### D4 — Player-adjusted Dixon–Coles (M, depends on D2)
- Remove a player (suspension) → recompute expected goals → rerun Monte Carlo.
- Extend `/simulate` with `missing_players[]`.

### D5 — Market-value signal (blocked)
Requires Transfermarkt. Revisit only if permission is obtained.

### D6 — xG-enhanced model (blocked)
Requires FBref. Revisit only if permission is obtained.

---

## 5. Workstream E — Protection, limits, operations

### E1 — Rate limiting (M)
Two layers, nginx first (already in front of both web and API), app middleware second.

- nginx zones in `nginx/nginx.conf` (or the vhost):
  - `limit_req_zone $binary_remote_addr zone=static:10m rate=30r/s;`
  - `limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;`
  - `limit_req_zone $binary_remote_addr zone=expensive:10m rate=6r/m;`
  - `limit_conn_zone $binary_remote_addr zone=conn:10m;`
- Locations: `= /api/proxy/simulate` → `expensive` burst 3 nodelay; `/api/proxy/` → `api`
  burst 20; everything else → `static` burst 60. `limit_conn conn 20`.
- Return `429` + `Retry-After`; never 403 on rate, so clients can back off.
- Allowlist `127.0.0.1` / docker bridge so the web container's server-side proxy is not
  throttled by its own requests.
- FastAPI middleware as a second layer for `/conversation` and `/simulate`, keyed by
  client IP from `X-Forwarded-For`, with the same numbers in config, not hard-coded.

### E2 — Bot mitigation (M)
- `robots.txt`: `Disallow: /api/`, `/askme`, `/house-keeping`, `/releases`, `/qrcode`;
  explicit `User-agent: GPTBot / CCBot / ClaudeBot / Bytespider / Amazonbot / Google-Extended`
  → `Disallow: /`.
- nginx: reject empty UA and known scraper UAs on `/api/`; challenge (not block) bursts of
  sequential `/team/*`, `/city/*`, `/country/*` enumeration; `limit_req` as above.
- Keep normal browser traffic untouched: no JS challenge on first page view, no CAPTCHA.
- Log every 429/reject to OpenObserve with UA, path, country and count.

### E3 — Ask Me quotas (S)
- Per-IP and per-session caps (e.g. 10 questions/hour, 50/day), token budget per request,
  hard timeout.
- Cache identical questions for a short TTL so repeated prompts do not hit the model.

### E4 — MCP quotas (S)
- Per-key daily call cap, per-tool caps for expensive endpoints (`/simulate`, `/conversation`),
  `429` + structured error.
- One key per consumer; no shared anonymous key; log key id (never the secret).

### E5 — Abuse notice (S)
- Home page banner (dismissible, stored in `localStorage`): short text, link to `/about#usage`.
- `/about#usage` section states: data is free for personal/research use with attribution;
  automated bulk collection, AI training crawls and MCP abuse are rate-limited and may be
  blocked; contact address for permission or a data dump.
- Must not block normal browsing and must not appear on the simulation result path.

### E6 — Release notes automation (S)
- `make release-notes` generates `api-vX.Y.Z.md` / `web-vX.Y.Z.md` from the bump.
- CI check: bumped version without a note fails.

### E7 — Observability (S)
- Dashboard panels: 429 rate, top blocked IPs/UAs, Ask Me cost per day, MCP calls per key.

---

## 6. Milestones

| Milestone | Content | Outcome |
|---|---|---|
| **M0 — visible fixes** | A1, A4, A5, A6, E6 | Home/nav coherent, tournament + season pages show matches, credits and release notes correct |
| **M1 — geography** | A2, A3, A7 | Countries → cities → matches fully navigable |
| **M2 — protection** | E1, E2, E3, E4, E5, E7 | Scrapers and AI bots throttled, Ask Me and MCP capped |
| **M3 — players** | B4, C1, D1 | Real player pages from data already owned |
| **M4 — squads** | B3, C3, D2 | Squad lists per match; age/caps calibration tested in H2H |
| **M5 — events** | C2, D3, D4 | Shot maps, xG, player-adjusted simulation |
| **M6 — completeness** | B2 | Defunct/pre-war coverage (women's football deferred) |

Order rationale: M0/M1 are cheap and user-visible; M2 protects infrastructure before traffic
grows; M3 is the cheapest data unlock (CC0, no scraping); M4 and M5 depend on new ingests;
M6 is the largest and least urgent. Women's football is explicitly deferred.

---

## 7. Decisions (settled 2026-11-07)

| # | Decision | Call |
|---|---|---|
| 1 | Women's football scope | **Out of scope for now** — no women's data, no `gender` work |
| 2 | Squad source | **OpenFootball + Wikipedia** for tournaments; StatsBomb where it overlaps |
| 3 | Scraping policy | **Keep the hard no-scraping rule**; FBref/Transfermarkt/Sofascore/FotMob stay blocked |
| 4 | Rate-limit home | **nginx only** — no Cloudflare |
| 5 | Player identity | **Wikidata auto-matching + review queue**; nothing guessed |
| 6 | Shot-map scope | **Explicit fallback on every match** when event data is absent |

Still to confirm before the relevant milestone:

7. **Wikipedia licence** — CC BY-SA 4.0 accepted for facts (squads, DOB cross-checks)?
8. **Event storage** — separate `data/events/` Parquet store acceptable?
9. **Squad coverage** — accept "major tournaments only" for v1?
10. **Prod rollout** — deploy per milestone or batch at the end?

---

## 8. Risks

- **Entity resolution** (players, team renames, defunct nations) is the largest hidden cost.
- **Licence compliance**: StatsBomb non-commercial; Wikipedia share-alike; any scraping
  violates ToS regardless of the data being free to view.
- **Model overfitting**: every new feature must beat the walk-forward baseline or be dropped.
- **Rate limiting false positives** blocking normal users or the app's own server-side proxy.
- **Data volume**: StatsBomb events are orders of magnitude larger than the current 7 MB
  dataset; needs a separate store or Parquet partitioning.

---

## 9. Schema changes at a glance

| Table / column | Introduced by | Purpose |
|---|---|---|
| `matches.gender` (`men`/`women`) | B1 (deferred) | Reserved for if women's football returns |
| `teams.status` (`active`/`defunct`) | B2 | Defunct-nation views |
| `players(id, wikidata_qid, name, dob, position, nationality, gender)` | B4 | Player pages, age |
| `player_appearances(player_id, match_id, team, minutes, goals, assists, cards)` | B4 | Caps, scorer links |
| `match_squads(match_id, team, source, source_url, retrieved_at)` | B3 | Provenance per squad |
| `squad_players(match_id, team, player_id, shirt_no, position, starter, minutes, captain)` | B3 | Lineups |
| `events(match_id, team, player_id, type, minute, x, y, xg, body_part, outcome)` | C2 | Shot maps, xG |
| `lineups` / `three_sixty_frames` | C2 | Pass networks, freeze frames |

All new tables live beside the existing CSVs; nothing is rewritten in place. Every row carries
its source so the UI can label coverage and credits can be generated from the data itself.

---

## 10. Delivery order (branch per item)

| Order | Branch | Content | Depends on |
|---|---|---|---|
| 1 | `feat/nav-config` | A1 + A6 + A7 | — |
| 2 | `feat/tournament-matches` | A4 + A5 | — |
| 3 | `feat/release-notes-1.4` | audit #7 + E6 | — |
| 4 | `feat/countries-cities` | A2 + A3 | 1 |
| 5 | `feat/rate-limits` | E1 + E2 + E5 | — |
| 6 | `feat/askme-mcp-quotas` | E3 + E4 + E7 | 5 |
| 7 | `feat/wikidata-players` | C1 + B4 + D1 | — |
| 8 | `feat/openfootball-squads` | C3 + B3 | 7 |
| 9 | `feat/squad-calibration` | D2 (+ D4 if it wins) | 8 |
| 10 | `feat/statsbomb-events` | C2 + D3 | 8 |
| 11 | `feat/defunct-nations` | B2 | 7 |

Each branch: worktree from up-to-date `main`, tests first where practical, one logical commit
per step, PR to `main`, deploy to dev (`boyz@192.168.1.61`), then prod when approved.
