# Plan: 001-tournaments-page

## Goal

Add a Tournaments list page to the web frontend showing all tournaments with basic stats.

## API (already exists)

`GET /tournaments` returns `list[TournamentListItem]` with: tournament, first_year, last_year, editions, matches, total_goals, home_wins, away_wins, draws, avg_goals, unique_teams, seasons.

## Steps

### Step 1 — Add `TournamentListItem` type

- **File:** `web/src/lib/types.ts`
- Add `TournamentListItem` interface matching API response shape
- **Commit:** `feat: add TournamentListItem type to web types`

### Step 2 — Add Tournaments to Sidebar

- **File:** `web/src/components/layout/Sidebar.tsx`
- Import `Trophy` from `lucide-react`, add nav item after Teams
- **Commit:** `feat: add Tournaments link to sidebar navigation`

### Step 3 — Create tournaments page component

- **File:** `web/src/app/tournaments/page.tsx` (new)
- Server component with metadata, renders `<TournamentsClient />`
- **Commit:** `feat: create tournaments page component`

### Step 4 — Create tournaments client component

- **File:** `web/src/app/tournaments/tournaments-client.tsx` (new)
- Fetches `/api/proxy/tournaments`
- FilterBar with `fields={{ teams: false }}` — shows tournaments (multi), countries, dates
- DataTable columns: Tournament, First Season, Last Season, Editions, Total Matches, Total Goals
- Default sort: Total Matches descending
- **Commit:** `feat: create tournaments client with data table and filters`

### Step 5 — Validate

- Run `pnpm lint` and `pnpm typecheck` in `web/`
- Fixes go in preceding commits

## Files summary

| File | Action |
|---|---|
| `web/src/lib/types.ts` | Modify — add interface |
| `web/src/components/layout/Sidebar.tsx` | Modify — add nav item |
| `web/src/app/tournaments/page.tsx` | Create |
| `web/src/app/tournaments/tournaments-client.tsx` | Create |
