import type {
  FilterParams,
  SummaryResponse,
  TeamStats,
  TeamListItem,
  HeadToHeadResponse,
  TournamentListItem,
  TournamentDetail,
  CountryListItem,
  CountryDetail,
  CityListItem,
  CityDetail,
  TeamRankingResponse,
  TopScorersResponse,
  BiggestWinItem,
  GoalsPerYearItem,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api/proxy";

function buildFilterQuery(filters?: FilterParams): string {
  const params = new URLSearchParams();
  if (filters?.tournaments)
    filters.tournaments.forEach((t) => params.append("tournaments", t));
  if (filters?.countries)
    filters.countries.forEach((c) => params.append("countries", c));
  if (filters?.date_from) params.set("date_from", filters.date_from);
  if (filters?.date_to) params.set("date_to", filters.date_to);
  return params.toString();
}

async function fetchApi<T>(path: string, query?: string): Promise<T> {
  const url = `${API_BASE}${path}${query ? `?${query}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ── Meta ──
export async function getHealth() {
  return fetchApi<{ status: string; data_loaded: boolean }>("/health");
}

// ── Summary (Dashboard) ──
export async function getSummary(filters?: FilterParams) {
  return fetchApi<SummaryResponse>("/summary", buildFilterQuery(filters));
}

// ── Teams ──
export async function getTeams(filters?: FilterParams) {
  // Teams list is built from /most/matches (rankings endpoint)
  const data = await fetchApi<TeamRankingResponse>(
    "/most/matches",
    `top_n=500${filters ? "&" + buildFilterQuery(filters) : ""}`
  );
  return data.teams;
}

export async function getTeam(name: string, filters?: FilterParams) {
  return fetchApi<TeamStats>(`/team/${encodeURIComponent(name)}`, buildFilterQuery(filters));
}

// ── Head-to-Head ──
export async function getHeadToHead(
  team1: string,
  team2: string,
  filters?: FilterParams
) {
  const params = new URLSearchParams({ team1, team2 });
  if (filters) {
    const fq = buildFilterQuery(filters);
    if (fq) params.append("", fq); // not ideal, merge properly
  }
  // Rebuild query properly
  let qs = `team1=${encodeURIComponent(team1)}&team2=${encodeURIComponent(team2)}`;
  const fq = buildFilterQuery(filters);
  if (fq) qs += "&" + fq;
  return fetchApi<HeadToHeadResponse>("/head_to_head", qs);
}

// ── Tournaments ──
export async function getTournaments(filters?: FilterParams) {
  return fetchApi<TournamentListItem[]>("/tournaments", buildFilterQuery(filters));
}

export async function getTournament(name: string, filters?: FilterParams) {
  return fetchApi<TournamentDetail>(
    `/tournament/${encodeURIComponent(name)}`,
    buildFilterQuery(filters)
  );
}

// ── Countries ──
export async function getCountries(filters?: FilterParams) {
  return fetchApi<CountryListItem[]>("/countries", buildFilterQuery(filters));
}

export async function getCountry(name: string, filters?: FilterParams) {
  return fetchApi<CountryDetail>(
    `/country/${encodeURIComponent(name)}`,
    buildFilterQuery(filters)
  );
}

// ── Cities ──
export async function getCities(filters?: FilterParams) {
  return fetchApi<CityListItem[]>("/cities", buildFilterQuery(filters));
}

export async function getCity(name: string, filters?: FilterParams) {
  return fetchApi<CityDetail>(
    `/city/${encodeURIComponent(name)}`,
    buildFilterQuery(filters)
  );
}

// ── Rankings ──
export async function getRankings(
  stat: string,
  topN: number = 20,
  filters?: FilterParams
) {
  const params = new URLSearchParams({ top_n: String(topN) });
  const fq = buildFilterQuery(filters);
  if (fq) params.append("", fq);
  let qs = `top_n=${topN}`;
  if (fq) qs += "&" + fq;
  return fetchApi<TeamRankingResponse>(`/most/${stat}`, qs);
}

// ── Top Scorers ──
export async function getTopScorers(topN: number = 20) {
  return fetchApi<TopScorersResponse>("/top_scorers", `top_n=${topN}`);
}

// ── Biggest Wins ──
export async function getBiggestWins(topN: number = 10, filters?: FilterParams) {
  let qs = `top_n=${topN}`;
  const fq = buildFilterQuery(filters);
  if (fq) qs += "&" + fq;
  return fetchApi<BiggestWinItem[]>("/biggest_wins", qs);
}

// ── Goals Per Year ──
export async function getGoalsPerYear(
  sortBy: string = "goals",
  order: string = "desc",
  filters?: FilterParams
) {
  let qs = `sort_by=${sortBy}&order=${order}`;
  const fq = buildFilterQuery(filters);
  if (fq) qs += "&" + fq;
  return fetchApi<GoalsPerYearItem[]>("/goals_per_year", qs);
}
