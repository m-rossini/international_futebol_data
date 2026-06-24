"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { formatNumber, winRateClass, getFlagUrl } from "@/lib/utils";
import { useFilterHref } from "@/lib/use-filter-href";
import type { TeamListItem } from "@/lib/types";

const API = "/api/proxy";


function buildFilterQs(params: { tournaments: string; countries: string; date_from: string; date_to: string }): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function TeamsClient() {
  const router = useRouter();
  const to = useFilterHref();
  const searchParams = useSearchParams();
  const tournaments = searchParams.get("tournaments") || "";
  const countries = searchParams.get("countries") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
    const fq = buildFilterQs(params);

    async function load() {
      if (!cancelled) setLoading(true);
      try {
        const res = await fetch(`${API}/most/matches?top_n=500${fq ? "&" + fq : ""}`).then((r) => r.json());
        if (!cancelled) {
          const mapped: TeamListItem[] = (res.ranking || []).map((t: Record<string, unknown>) => ({
            team: String(t.team || ""),
            matches: Number((t as Record<string, number>).matches_played ?? 0),
            wins: Number((t as Record<string, number>).wins ?? 0),
            losses: Number((t as Record<string, number>).losses ?? 0),
            draws: Number((t as Record<string, number>).draws ?? 0),
            win_rate: Number((t as Record<string, number>).win_rate ?? 0),
          }));
          setTeams(mapped);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) setLoading(false);
        console.error("Failed to load teams:", err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tournaments, countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div>
        <div className="skeleton h-10 w-32 mb-2 rounded" />
        <div className="skeleton h-5 w-64 mb-4 rounded" />
        <div className="skeleton h-[52px] mb-6 rounded" />
        <div className="card p-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 mb-3">
              <div className="skeleton h-4 w-6 rounded" />
              <div className="skeleton h-5 w-32 rounded" />
              <div className="skeleton h-4 w-16 rounded ml-auto" />
              <div className="skeleton h-4 w-16 rounded" />
              <div className="skeleton h-4 w-16 rounded" />
              <div className="skeleton h-4 w-12 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const columns = [
    { key: "rank", header: "#", sortable: true, render: (_: TeamListItem, idx: number) => idx + 1, className: "w-12" },
    {
      key: "team", header: "Team", sortable: true,
      render: (t: TeamListItem) => (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
      <FilterBar showCountries showDateRange />
      <DataTable
        columns={columns}
        data={teams}
        keyField="team"
        defaultSort={{ key: "matches", dir: "desc" }}
        onRowClick={(t) => router.push(to(`/teams/${encodeURIComponent(t.team)}`))}
      />
    </div>
  );
}
