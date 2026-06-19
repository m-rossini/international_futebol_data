"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { formatNumber, winRateClass, getFlagUrl } from "@/lib/utils";
import type { TeamListItem } from "@/lib/types";

const API = "/api/proxy";

function useQueryParams() {
  const sp = useSearchParams();
  return {
    tournaments: sp.get("tournaments") || "",
    countries: sp.get("countries") || "",
    date_from: sp.get("date_from") || "",
    date_to: sp.get("date_to") || "",
  };
}

function buildFilterQs(params: ReturnType<typeof useQueryParams>): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function TeamsClient() {
  const router = useRouter();
  const params = useQueryParams();
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const fq = buildFilterQs(params);
      const res = await fetch(`${API}/most/matches?top_n=500${fq ? "&" + fq : ""}`).then((r) => r.json());
      // Map ranking items to TeamListItem
      const mapped: TeamListItem[] = (res.teams || []).map((t: { team: string; value: number }) => ({
        team: t.team,
        matches: t.value,
        wins: 0,
        losses: 0,
        draws: 0,
        win_rate: 0,
      }));
      setTeams(mapped);
    } catch (err) {
      console.error("Failed to load teams:", err);
    }
    setLoading(false);
  }, [params.tournaments, params.countries, params.date_from, params.date_to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div>
        <h1 className="page-title mb-2">Teams</h1>
        <p className="text-[14px] text-[#6C757D] mb-4">Loading...</p>
      </div>
    );
  }

  const columns = [
    { key: "rank", header: "#", sortable: true, render: (_: TeamListItem, idx: number) => idx + 1, className: "w-12" },
    {
      key: "team", header: "Team", sortable: true,
      render: (t: TeamListItem) => (
        <div className="flex items-center gap-2">
          <img src={getFlagUrl(t.team, 24)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
          <span>{t.team}</span>
        </div>
      ),
    },
    { key: "matches", header: "Matches", sortable: true, render: (t: TeamListItem) => formatNumber(t.matches) },
    { key: "wins", header: "Wins", sortable: true, render: (t: TeamListItem) => formatNumber(t.wins) },
    { key: "losses", header: "Losses", sortable: true, render: (t: TeamListItem) => formatNumber(t.losses) },
    { key: "draws", header: "Draws", sortable: true, render: (t: TeamListItem) => formatNumber(t.draws) },
    {
      key: "win_rate", header: "Win Rate", sortable: true,
      render: (t: TeamListItem) => (
        <span className={`badge ${winRateClass(t.win_rate)}`}>{t.win_rate.toFixed(1)}%</span>
      ),
    },
  ];

  return (
    <div>
      <h1 className="page-title mb-2">Teams</h1>
      <p className="text-[14px] text-[#6C757D] mb-4">
        {teams.length} teams. Click a row to view detailed stats.
      </p>
      <FilterBar showTournaments showCountries showDateRange />
      <DataTable
        columns={columns}
        data={teams}
        keyField="team"
        defaultSort={{ key: "matches", dir: "desc" }}
        onRowClick={(t) => router.push(`/teams/${encodeURIComponent(t.team)}`)}
      />
    </div>
  );
}
