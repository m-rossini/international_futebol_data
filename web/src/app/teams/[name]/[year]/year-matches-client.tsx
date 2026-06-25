"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";
import type { MatchItem, TeamMatchesByYear } from "@/lib/types";

const API = "/api/proxy";

function buildQs(params: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of ["tournaments", "countries", "date_from", "date_to"]) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

function formatDate(raw: string): string {
  // API returns "2022-11-24 00:00:00" — use just the date portion
  const d = new Date(raw.slice(0, 10) + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isoInputDate(raw: string): string {
  return raw.slice(0, 10); // → "2022-11-24"
}

function resultLabel(
  m: MatchItem,
  teamName: string,
): { label: string; cls: string } {
  const isHome = m.home_team === teamName;
  const gf = isHome ? m.home_score : m.away_score;
  const ga = isHome ? m.away_score : m.home_score;
  if (gf > ga) return { label: "W", cls: "bg-green-100 text-green-700" };
  if (gf < ga) return { label: "L", cls: "bg-red-100 text-red-700" };
  return { label: "D", cls: "bg-amber-100 text-amber-700" };
}

interface Props {
  teamName: string;
  year: number;
}

export function YearMatchesClient({ teamName, year }: Props) {
  const sp = useSearchParams();
  const router = useRouter();

  const [data, setData] = useState<TeamMatchesByYear | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- client-side filter state ---
  const [filtOpponent, setFiltOpponent] = useState<string[]>([]);
  const [filtTournament, setFiltTournament] = useState<string[]>([]);
  const [filtCountry, setFiltCountry] = useState<string[]>([]);
  const [filtCity, setFiltCity] = useState<string[]>([]);
  const [filtDateFrom, setFiltDateFrom] = useState("");
  const [filtDateTo, setFiltDateTo] = useState("");

  const qs = useMemo(() => buildQs(sp), [sp]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const url = `${API}/team/${encodeURIComponent(teamName)}/matches/${year}${qs ? "?" + qs : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: TeamMatchesByYear = await res.json();
        if (!cancelled) {
          if (json.error) {
            setError(json.message || "Team not found");
          } else {
            setData(json);
            // Reset local filters when new data arrives
            setFiltOpponent([]);
            setFiltTournament([]);
            setFiltCountry([]);
            setFiltCity([]);
            setFiltDateFrom("");
            setFiltDateTo("");
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load matches");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [teamName, year, qs]);

  // --- derived lists from loaded data ---
  const filterOptions = useMemo(() => {
    if (!data?.matches_list) {
      return { opponents: [], tournaments: [], countries: [], cities: [] };
    }
    const opponents = new Set<string>();
    const tournaments = new Set<string>();
    const countries = new Set<string>();
    const cities = new Set<string>();
    for (const m of data.matches_list) {
      if (m.home_team !== teamName) opponents.add(m.home_team);
      if (m.away_team !== teamName) opponents.add(m.away_team);
      if (m.tournament) tournaments.add(m.tournament);
      if (m.country) countries.add(m.country);
      if (m.city) cities.add(m.city);
    }
    return {
      opponents: [...opponents].sort(),
      tournaments: [...tournaments].sort(),
      countries: [...countries].sort(),
      cities: [...cities].sort(),
    };
  }, [data, teamName]);

  // --- filtered matches ---
  const filtered = useMemo(() => {
    if (!data?.matches_list) return [];
    return data.matches_list.filter((m) => {
      if (
        filtOpponent.length > 0 &&
        !filtOpponent.includes(m.home_team) &&
        !filtOpponent.includes(m.away_team)
      )
        return false;
      if (filtTournament.length > 0 && m.tournament && !filtTournament.includes(m.tournament))
        return false;
      if (filtCountry.length > 0 && m.country && !filtCountry.includes(m.country))
        return false;
      if (filtCity.length > 0 && m.city && !filtCity.includes(m.city)) return false;
      if (filtDateFrom && isoInputDate(m.date) < filtDateFrom) return false;
      if (filtDateTo && isoInputDate(m.date) > filtDateTo) return false;
      return true;
    });
  }, [data, filtOpponent, filtTournament, filtCountry, filtCity, filtDateFrom, filtDateTo]);

  const handleBack = useCallback(() => {
    const params = new URLSearchParams(sp.toString());
    const q = params.toString();
    router.push(`/teams/${encodeURIComponent(teamName)}${q ? `?${q}` : ""}`);
  }, [router, sp, teamName]);

  // Column defs that close over teamName
  const matchColumns: Column<MatchItem>[] = useMemo(
    () => [
      { key: "date", header: "Date", sortable: true, render: (m) => formatDate(m.date) },
      { key: "tournament", header: "Tournament", sortable: true },
      { key: "city", header: "City", sortable: true },
      { key: "country", header: "Country", sortable: true },
      {
        key: "home_team",
        header: "Home",
        sortable: true,
        render: (m) => (
          <span className={m.home_team === teamName ? "font-semibold" : ""}>
            {m.home_team}
          </span>
        ),
      },
      {
        key: "score",
        header: "Score",
        render: (m) => (
          <span className="tabular-nums font-mono">
            {m.home_score} – {m.away_score}
          </span>
        ),
      },
      {
        key: "away_team",
        header: "Away",
        sortable: true,
        render: (m) => (
          <span className={m.away_team === teamName ? "font-semibold" : ""}>
            {m.away_team}
          </span>
        ),
      },
      {
        key: "neutral",
        header: "Neutral",
        render: (m) => (m.neutral ? "Yes" : "No"),
      },
    ],
    [teamName],
  );

  // Summary counts (based on filtered data)
  const summary = useMemo(() => {
    if (filtered.length === 0) return null;
    let wins = 0;
    let losses = 0;
    let draws = 0;
    for (const m of filtered) {
      const r = resultLabel(m, teamName);
      if (r.label === "W") wins++;
      else if (r.label === "L") losses++;
      else draws++;
    }
    return { wins, losses, draws, total: filtered.length };
  }, [filtered, teamName]);

  // Is any client-side filter active?
  const anyFilterActive =
    filtOpponent.length > 0 ||
    filtTournament.length > 0 ||
    filtCountry.length > 0 ||
    filtCity.length > 0 ||
    filtDateFrom !== "" ||
    filtDateTo !== "";

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to {teamName}
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-1">
        {teamName} — {year} Matches
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        {sp.toString() ? "Results filtered by current selection" : "All matches"}
      </p>

      {loading ? (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500 mt-4">Error: {error}</p>
      ) : data ? (
        <>
          {/* --- Client-side filters --- */}
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div className="flex flex-col gap-1 min-w-[170px] max-w-[260px] flex-1">
              <label className="text-xs font-medium text-gray-500">Opponent</label>
              <AutocompleteInput
                options={filterOptions.opponents}
                selected={filtOpponent}
                onChange={setFiltOpponent}
                placeholder="Any opponent"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[170px] max-w-[260px] flex-1">
              <label className="text-xs font-medium text-gray-500">Tournament</label>
              <AutocompleteInput
                options={filterOptions.tournaments}
                selected={filtTournament}
                onChange={setFiltTournament}
                placeholder="Any tournament"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[170px] max-w-[260px] flex-1">
              <label className="text-xs font-medium text-gray-500">Country</label>
              <AutocompleteInput
                options={filterOptions.countries}
                selected={filtCountry}
                onChange={setFiltCountry}
                placeholder="Any country"
              />
            </div>
            <div className="flex flex-col gap-1 min-w-[170px] max-w-[260px] flex-1">
              <label className="text-xs font-medium text-gray-500">City</label>
              <AutocompleteInput
                options={filterOptions.cities}
                selected={filtCity}
                onChange={setFiltCity}
                placeholder="Any city"
              />
            </div>
            <div className="flex flex-col gap-1 w-[140px]">
              <label className="text-xs font-medium text-gray-500">From</label>
              <input
                type="date"
                value={filtDateFrom}
                onChange={(e) => setFiltDateFrom(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
              />
            </div>
            <div className="flex flex-col gap-1 w-[140px]">
              <label className="text-xs font-medium text-gray-500">To</label>
              <input
                type="date"
                value={filtDateTo}
                onChange={(e) => setFiltDateTo(e.target.value)}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
              />
            </div>
            {anyFilterActive && (
              <button
                type="button"
                onClick={() => {
                  setFiltOpponent([]);
                  setFiltTournament([]);
                  setFiltCountry([]);
                  setFiltCity([]);
                  setFiltDateFrom("");
                  setFiltDateTo("");
                }}
                className="px-3 py-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Summary cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard label="Matches" value={summary.total.toLocaleString()} />
              <StatCard label="Wins" value={summary.wins.toLocaleString()} />
              <StatCard label="Losses" value={summary.losses.toLocaleString()} />
              <StatCard label="Draws" value={summary.draws.toLocaleString()} />
            </div>
          )}

          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400">
              {anyFilterActive
                ? "No matches match the current filters."
                : "No matches found for this year."}
            </p>
          ) : (
            <DataTable
              columns={matchColumns}
              data={filtered}
              keyField="date"
              defaultSort={{ key: "date", dir: "desc" }}
            />
          )}
        </>
      ) : null}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="text-xl font-bold text-gray-800">{value}</span>
    </div>
  );
}
