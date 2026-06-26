"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
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
    key: "goals_for",
    header: "GF",
    sortable: true,
    render: (row) => row.goals_for.toLocaleString(),
  },
  {
    key: "goals_against",
    header: "GA",
    sortable: true,
    render: (row) => row.goals_against.toLocaleString(),
  },
  {
    key: "gf_ga_ratio",
    header: "GF/GA",
    sortable: true,
    render: (row) =>
      row.goals_against > 0
        ? row.gf_ga_ratio.toFixed(2)
        : "—",
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
  const router = useRouter();
  const pathname = usePathname();
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
        const data: TeamItem[] = (await res.json()).map((t: TeamItem) => ({
          ...t,
          gf_ga_ratio: t.goals_against > 0 ? t.goals_for / t.goals_against : 0,
        }));
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
  const minMatches = useMemo(() => {
    const v = sp.get("min_matches");
    return v ? Math.max(0, parseInt(v, 10) || 0) : 0;
  }, [sp]);

  const setMinMatches = useCallback(
    (value: number) => {
      const params = new URLSearchParams(sp.toString());
      if (value > 0) {
        params.set("min_matches", String(value));
      } else {
        params.delete("min_matches");
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp]
  );

  const filteredTeams = useMemo(() => {
    let result = teams;

    if (teamFilter.length > 0) {
      const set = new Set(teamFilter);
      result = result.filter((t) => set.has(t.team));
    }

    if (minMatches > 0) {
      result = result.filter((t) => t.matches_played >= minMatches);
    }

    return result;
  }, [teams, teamFilter, minMatches]);

  const sortKey = useMemo(() => sp.get("sort") || null, [sp]);
  const sortDir = useMemo(() => {
    const d = sp.get("dir");
    return d === "asc" || d === "desc" ? d : null;
  }, [sp]);

  const handleSortChange = useCallback(
    (key: string | null, dir: "asc" | "desc" | null) => {
      const params = new URLSearchParams(sp.toString());
      if (key && dir) {
        params.set("sort", key);
        params.set("dir", dir);
      } else {
        params.delete("sort");
        params.delete("dir");
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp]
  );

  const handleRowClick = useCallback(
    (row: TeamItem) => {
      const params = new URLSearchParams(sp.toString());
      const qs = params.toString();
      router.push(`/teams/${encodeURIComponent(row.team)}${qs ? `?${qs}` : ""}`);
    },
    [router, sp]
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Teams</h1>
      <FilterBar>
        <div className="flex flex-col gap-1 w-[140px]">
          <label className="text-xs font-medium text-gray-500">Min. matches</label>
          <input
            type="number"
            min={0}
            value={minMatches || ""}
            onChange={(e) => setMinMatches(Number(e.target.value))}
            placeholder="0"
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
          />
        </div>
      </FilterBar>
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Error: {error}</p>
      ) : (
        <DataTable
          columns={columns}
          data={filteredTeams}
          keyField="team"
          defaultSort={{ key: "matches_played", dir: "desc" }}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={handleSortChange}
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
