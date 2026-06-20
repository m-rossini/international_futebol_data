# International Football Data — Web

Next.js 15 frontend for exploring international football match statistics.

**React 19 · Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Nivo Charts**

---

## Quick Start (Docker)

```bash
# From repository root:
make up          # Start full stack (api + web)
make web-build   # Build web image only
make web-up      # Start web dev container (sleep mode)
make web-run     # Start Next.js dev server inside container
```

Web runs on **http://localhost:7500** (proxies API calls to `http://api:7531`).

---

## Quick Start (Local)

```bash
cd web
pnpm install
pnpm dev
```

Set `NEXT_PUBLIC_API_URL=http://localhost:7531` if running the API locally.

---

## Pages

| Route | Description |
|---|---|
| `/` | Dashboard — global stats, match distributions, home advantage |
| `/teams` | 500+ international teams, sortable table with flags |
| `/teams/[name]` | Team detail — wins/losses/draws, goal distributions, compare link |
| `/tournaments` | Tournament browser with editions, stats |
| `/tournaments/[name]` | Tournament detail — yearly breakdown, top teams |
| `/countries` | Country browser with match/tournament counts |
| `/countries/[name]` | Country detail — top teams, cities, tournaments |
| `/cities` | City browser with match counts |
| `/cities/[name]` | City detail — top teams, tournaments |
| `/rankings` | Leaderboard by stat (wins, goals scored, win rate, etc.) |
| `/head-to-head` | Side‑by‑side comparison of any two teams |
| `/top-scorers` | All‑time goal scorers leaderboard |
| `/biggest-wins` | Matches with the largest goal margins |
| `/goals-per-year` | Yearly goals and matches trend |

All pages include a filter bar for narrowing results by tournament, country, and date range.

---

## Project Structure

```
web/
├── src/
│   ├── app/                    Next.js App Router pages
│   │   ├── page.tsx            Redirects to /dashboard-client
│   │   ├── layout.tsx          Root layout (metadata, fonts)
│   │   ├── globals.css         Tailwind base styles
│   │   ├── dashboard-client.tsx
│   │   ├── teams/
│   │   ├── tournaments/
│   │   ├── countries/
│   │   ├── cities/
│   │   ├── rankings/
│   │   ├── head-to-head/
│   │   ├── top-scorers/
│   │   ├── biggest-wins/
│   │   └── goals-per-year/
│   ├── components/
│   │   └── shared/             Reusable UI components
│   │       ├── StatsCard.tsx    KPI card with label/value/sub
│   │       ├── DataTable.tsx    Sortable, clickable table
│   │       ├── FilterBar.tsx    Tournament/country/date filters
│   │       ├── TopList.tsx      Ranked list with bars
│   │       ├── StatsSeriesCard.tsx  Statistical distribution card
│   │       └── ColorLegend.tsx
│   ├── lib/
│   │   ├── api.ts             Typed API client
│   │   ├── types.ts           TypeScript interfaces matching API responses
│   │   └── utils.ts           Formatting & helper utilities
│   └── middleware.ts           API proxy rewrite
├── public/
├── Dockerfile
├── package.json
├── tsconfig.json
└── next.config.ts
```

---

## Development

### Type Checking & Linting

```bash
pnpm build        # Production build (includes type checking)
pnpm lint         # ESLint
npx tsc --noEmit  # TypeScript check only
```

### Architecture Notes

- **Client components only.** All pages use `"use client"` — data is fetched client‑side from the API. No server‑side rendering (SSR) data fetching.
- **API proxy.** Next.js middleware rewrites `/api/proxy/*` → `http://api:7531/*` in Docker. Locally, set `NEXT_PUBLIC_API_URL`.
- **Direct fetch.** Each page component fetches its own data using `fetch()` with `useEffect` + cleanup (cancelled flag) to prevent race conditions.
- **Shadcn‑style components.** Uses Radix UI primitives (`@radix-ui/react-dialog`, `-select`, `-tabs`, `-popover`, `-tooltip`) with Tailwind CSS 4 styling.
- **Charts.** Nivo (`@nivo/bar`, `@nivo/line`, `@nivo/pie`) for data visualizations.

### Adding a New Page

1. Create `src/app/my-page/my-page-client.tsx` with `"use client"`.
2. Create `src/app/my-page/page.tsx` that imports and renders the client component.
3. Add types in `src/lib/types.ts` matching the API response.
4. Add route to API endpoints table above.

### Testing

```bash
# Via Make (containerized)
make web-test    # Run ESLint

# Locally
pnpm lint
pnpm build      # TypeScript + Next.js production build
```

No unit test suite yet — see TODO.md.
