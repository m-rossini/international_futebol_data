"use client";

import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import type { TeamItem } from "@/lib/types";

const API = "/api/proxy";

function winRateColor(rate: number): string {
  if (rate >= 60) return "text-green-600 font-semibold";
  if (rate >= 45) return "text-amber-600 font-semibold";
  return "text-red-500 font-semibold";
}

const columns: Column<TeamItem>[] = [
  { key: "team", header: "Team", sortable: true },
  {
    key: "matches_played",
    header: "Matches",
    sortable: true,
    render: (row) => row.matches_played.toLocaleString(),
  },
  {
    key: "wins",
    header: "Wins",
    sortable: true,
    render: (row) => row.wins.toLocaleString(),
  },
  {
    key: "losses",
    header: "Losses",
    sortable: true,
    render: (row) => row.losses.toLocaleString(),
  },
  {
    key: "draws",
    header: "Draws",
    sortable: true,
    render: (row) => row.draws.toLocaleString(),
  },
  {
    key: "win_rate",
    header: "Win Rate",
    sortable: true,
    render: (row) => (
      <span className={winRateColor(row.win_rate)}>
        {row.win_rate.toFixed(1)}%
      </span>
    ),
  },
  {
    key: "unique_countries",
    header: "Countries",
    sortable: true,
    render: (row) => row.unique_countries.toLocaleString(),
  },
];

function buildQs(params: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of ["tournaments", "countries", "date_from", "date_to"]) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

export function TeamsClient() {
  const sp = useSearchParams();
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => buildQs(sp), [sp]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const url = `${API}/teams${qs ? "?" + qs : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TeamItem[] = await res.json();
        if (!cancelled) {
          setTeams(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load teams");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [qs]);

  const teamFilter = useMemo(
    () => sp.get("teams")?.split(",").filter(Boolean) || [],
    [sp]
  );
  const filteredTeams = useMemo(() => {
    if (teamFilter.length === 0) return teams;
    const set = new Set(teamFilter);
    return teams.filter((t) => set.has(t.team));
  }, [teams, teamFilter]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Teams</h1>
      <FilterBar />
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Error: {error}</p>
      ) : (
        <DataTable columns={columns} data={filteredTeams} keyField="team" defaultSort={{ key: "matches_played", dir: "desc" }} />
      )}
    </div>
  );
}
