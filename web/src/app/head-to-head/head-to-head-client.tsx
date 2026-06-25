"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";
import type { HeadToHeadResult, MatchItem } from "@/lib/types";

const API = "/api/proxy";

let cachedTeams: string[] | null = null;
async function fetchTeams(): Promise<string[]> {
  if (cachedTeams) return cachedTeams;
  const res = await fetch(`${API}/filters`);
  const data = await res.json();
  cachedTeams = data.teams || [];
  return cachedTeams;
}

function buildQs(params: URLSearchParams, team1: string, team2: string): string {
  const q = new URLSearchParams();
  q.set("team1", team1);
  q.set("team2", team2);
  for (const key of ["tournaments", "countries", "date_from", "date_to"]) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

interface IndexedMatch extends MatchItem {
  _key: string;
}

export function HeadToHeadClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [team1, setTeam1] = useState(sp.get("team1") || "");
  const [team2, setTeam2] = useState(sp.get("team2") || "");
  const [result, setResult] = useState<HeadToHeadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load team names once
  useEffect(() => {
    fetchTeams().then(setTeamNames).catch(() => {});
  }, []);

  // Persist team selection to URL
  const updateTeamParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp]
  );

  const handleTeam1 = useCallback(
    (sel: string[]) => {
      const val = sel[0] || "";
      setTeam1(val);
      updateTeamParam("team1", val);
    },
    [updateTeamParam]
  );

  const handleTeam2 = useCallback(
    (sel: string[]) => {
      const val = sel[0] || "";
      setTeam2(val);
      updateTeamParam("team2", val);
    },
    [updateTeamParam]
  );

  const swapTeams = useCallback(() => {
    const t1 = team2;
    const t2 = team1;
    setTeam1(t1);
    setTeam2(t2);
    const params = new URLSearchParams(sp.toString());
    params.set("team1", t1);
    params.set("team2", t2);
    router.replace(`${pathname}?${params.toString()}`);
  }, [team1, team2, router, pathname, sp]);

  // Fetch head-to-head when both teams selected + filters change
  const qs = useMemo(() => buildQs(sp, team1, team2), [sp, team1, team2]);

  useEffect(() => {
    if (!team1 || !team2) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const url = `${API}/head_to_head?${qs}`;
        const res = await fetch(url);
        const data: HeadToHeadResult = await res.json();
        if (!cancelled) {
          if (data.error) {
            setError(data.message || "An error occurred");
            setResult(null);
          } else {
            setResult(data);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      setError(null);
    };
  }, [qs, team1, team2]);

  // Extract dynamic keys from the API response
  const team1Wins = result ? ((result[`${result.team1}_wins`] as number) ?? 0) : 0;
  const team2Wins = result ? ((result[`${result.team2}_wins`] as number) ?? 0) : 0;
  const team1Goals = result ? ((result[`${result.team1}_goals`] as number) ?? 0) : 0;
  const team2Goals = result ? ((result[`${result.team2}_goals`] as number) ?? 0) : 0;

  // Add unique keys to match items
  const indexedMatches: IndexedMatch[] = useMemo(() => {
    if (!result) return [];
    return result.matches_list.map((m, i) => ({ ...m, _key: `${m.date}-${m.home_team}-${m.away_team}-${i}` }));
  }, [result]);

  const matchColumns: Column<IndexedMatch>[] = useMemo(
    () => [
      {
        key: "date",
        header: "Date",
        sortable: true,
        render: (row) => new Date(row.date).toLocaleDateString(),
      },
      { key: "tournament", header: "Tournament", sortable: true },
      { key: "city", header: "City", sortable: true },
      { key: "country", header: "Country", sortable: true },
      {
        key: "home_team",
        header: "Home",
        sortable: true,
        render: (row) => (
          <span className={row.home_score > row.away_score ? "font-semibold" : ""}>
            {row.home_team}
          </span>
        ),
      },
      {
        key: "score",
        header: "Score",
        render: (row) => (
          <span className="font-mono tabular-nums">
            {row.home_score} - {row.away_score}
          </span>
        ),
      },
      {
        key: "away_team",
        header: "Away",
        sortable: true,
        render: (row) => (
          <span className={row.away_score > row.home_score ? "font-semibold" : ""}>
            {row.away_team}
          </span>
        ),
      },
    ],
    []
  );

  const sameTeam = team1 && team2 && team1 === team2;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Head to Head</h1>

      {/* Team selectors */}
      <div className="flex items-end gap-2 mb-4">
        <div className="flex flex-col gap-1 min-w-[200px] max-w-[300px] flex-1">
          <label className="text-xs font-medium text-gray-500">Team 1</label>
          <AutocompleteInput
            options={teamNames}
            selected={team1 ? [team1] : []}
            onChange={handleTeam1}
            multi={false}
            placeholder="Select team..."
          />
        </div>

        <button
          type="button"
          onClick={swapTeams}
          disabled={!team1 || !team2}
          className="mb-0.5 p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title="Swap teams"
        >
          <ArrowRightLeft size={16} className="text-gray-500" />
        </button>

        <div className="flex flex-col gap-1 min-w-[200px] max-w-[300px] flex-1">
          <label className="text-xs font-medium text-gray-500">Team 2</label>
          <AutocompleteInput
            options={teamNames}
            selected={team2 ? [team2] : []}
            onChange={handleTeam2}
            multi={false}
            placeholder="Select team..."
          />
        </div>
      </div>

      <FilterBar fields={{ teams: false }} />

      {/* Content area */}
      {sameTeam ? (
        <p className="text-sm text-amber-600 mt-4">Select two different teams to compare.</p>
      ) : !team1 || !team2 ? (
        <p className="text-sm text-gray-400 mt-4">Select two teams to compare their head-to-head record.</p>
      ) : loading ? (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      ) : error ? (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      ) : result ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-6 mt-2">
            <StatCard label={result.team1} value={team1Wins} sub="wins" color="blue" />
            <StatCard label="Draws" value={result.draws} sub="" color="gray" />
            <StatCard label={result.team2} value={team2Wins} sub="wins" color="red" />
            <StatCard label={result.team1} value={team1Goals} sub="goals" color="blue" />
            <StatCard label={result.team2} value={team2Goals} sub="goals" color="red" />
          </div>

          {/* Match history */}
          {result.matches > 0 ? (
            <>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Match History ({result.matches} matches)
              </h2>
              <DataTable
                columns={matchColumns}
                data={indexedMatches}
                keyField="_key"
                defaultSort={{ key: "date", dir: "desc" }}
              />
            </>
          ) : (
            <p className="text-sm text-gray-400 mt-4">
              No matches found between {result.team1} and {result.team2} with the current filters.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: number;
  sub: string;
  color: "blue" | "red" | "gray";
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    red: "bg-red-50 border-red-200 text-red-800",
    gray: "bg-gray-50 border-gray-200 text-gray-800",
  };

  return (
    <div className={`rounded-lg border px-4 py-3 text-center ${colors[color]}`}>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
      <div className="text-xs mt-0.5 truncate" title={label}>
        {label}
      </div>
      {sub && <div className="text-[10px] opacity-70">{sub}</div>}
    </div>
  );
}
