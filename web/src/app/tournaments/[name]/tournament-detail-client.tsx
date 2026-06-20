"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { StatsCard } from "@/components/shared/StatsCard";
import { FilterBar } from "@/components/shared/FilterBar";
import { TopList } from "@/components/shared/TopList";
import { formatNumber } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { TournamentDetail } from "@/lib/types";

const API = "/api/proxy";


function buildFilterQs(params: { tournaments: string; countries: string; date_from: string; date_to: string }): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function TournamentDetailClient({ name }: { name: string }) {
  const sp = useSearchParams();
  const params = useMemo(() => ({
    tournaments: sp.get("tournaments") || "",
    countries: sp.get("countries") || "",
    date_from: sp.get("date_from") || "",
    date_to: sp.get("date_to") || "",
  }), [sp]);
  const [data, setData] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const fq = buildFilterQs(params);
      const res = await fetch(`${API}/tournament/${encodeURIComponent(name)}${fq ? "?" + fq : ""}`).then((r) => r.json());
      setData(res);
    } catch (err) {
      console.error("Failed to load tournament:", err);
    }
    setLoading(false);
  }, [name, params.tournaments, params.countries, params.date_from, params.date_to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div>
        <div className="skeleton h-8 w-48 mb-2 rounded" />
        <div className="skeleton h-5 w-32 mb-6 rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Link href="/tournaments" className="text-[14px] text-[#1A56DB] hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to Tournaments
        </Link>
        <h1 className="page-title mb-2">Tournament Not Found</h1>
        <p className="text-[14px] text-[#6C757D]">No data for &quot;{name}&quot;.</p>
      </div>
    );
  }

  const topTeams = Object.entries(data.top_teams)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([team, val], i) => ({
      rank: i + 1,
      name: team,
      value: formatNumber(val),
      href: `/teams/${encodeURIComponent(team)}`,
    }));

  const topHosts = Object.entries(data.top_hosts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([host, val], i) => ({
      rank: i + 1,
      name: host,
      value: formatNumber(val),
      href: `/countries/${encodeURIComponent(host)}`,
    }));

  return (
    <div>
      <Link href="/tournaments" className="text-[14px] text-[#1A56DB] hover:underline flex items-center gap-1 mb-1">
        <ArrowLeft size={14} /> Back to Tournaments
      </Link>
      <h1 className="page-title mb-1">{data.tournament}</h1>
      <p className="text-[14px] text-[#6C757D] mb-6">
        {data.first_year} – {data.last_year} · {data.seasons} editions · {data.teams} teams
      </p>

      <FilterBar showTournaments showCountries showDateRange />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard label="First Edition" value={data.first_year} />
        <StatsCard label="Last Edition" value={data.last_year} />
        <StatsCard label="Editions" value={data.seasons} />
        <StatsCard label="Matches" value={formatNumber(data.matches)} />
        <StatsCard label="Goals" value={formatNumber(data.goals)} sub={`${data.avg_goals_per_match.toFixed(2)} avg/match`} />
        <StatsCard label="Teams" value={data.teams} />
        <StatsCard label="Home Win Rate" value={`${data.home_win_pct.toFixed(0)}%`} subColor="success" />
        <StatsCard label="Draw Rate" value={`${data.draw_pct.toFixed(0)}%`} subColor="warning" />
      </div>

      {/* Yearly Breakdown Chart + Table */}
      {data.yearly_breakdown && data.yearly_breakdown.length > 0 && (
        <div className="card p-5 mb-8">
          <h3 className="section-title mb-4">📈 Goals Per Edition</h3>
          <div className="h-[220px] flex items-end gap-[2px] px-4 pb-2 mb-4">
            {data.yearly_breakdown
              .sort((a, b) => a.year - b.year)
              .map((yb) => {
                const maxGoals = Math.max(...data.yearly_breakdown.map((y) => y.goals));
                const pct = maxGoals > 0 ? (yb.goals / maxGoals) * 100 : 0;
                return (
                  <div
                    key={yb.year}
                    className="bg-[#1A56DB] rounded-t-sm flex-1"
                    style={{ height: `${pct}%`, opacity: 0.5 + pct / 200 }}
                    title={`${yb.year}: ${yb.goals} goals (${yb.matches} matches)`}
                  />
                );
              })}
          </div>

          <div className="overflow-x-auto">
            <table className="data-table w-full text-[13px]">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Matches</th>
                  <th>Goals</th>
                  <th>Avg</th>
                  <th>Home Wins</th>
                  <th>Away Wins</th>
                  <th>Draws</th>
                  <th>Hosts</th>
                </tr>
              </thead>
              <tbody>
                {data.yearly_breakdown
                  .sort((a, b) => b.year - a.year)
                  .map((yb) => (
                    <tr key={yb.year}>
                      <td className="font-semibold">{yb.year}</td>
                      <td>{formatNumber(yb.matches)}</td>
                      <td>{formatNumber(yb.goals)}</td>
                      <td>{yb.avg.toFixed(2)}</td>
                      <td>{yb.home_wins}</td>
                      <td>{yb.away_wins}</td>
                      <td>{yb.draws}</td>
                      <td className="text-[#6C757D]">{(yb.hosts || []).join(", ")}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Teams & Top Hosts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TopList title="🏆 Top Teams" items={topTeams} maxValue={topTeams[0] ? Number(topTeams[0].value) : 1} />
        <TopList title="🌍 Top Host Countries" items={topHosts} maxValue={topHosts[0] ? Number(topHosts[0].value) : 1} />
      </div>
    </div>
  );
}
