"use client";

import { useEffect, useState } from "react";
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
  const searchParams = useSearchParams();
  const tournaments = searchParams.get("tournaments") || "";
  const countries = searchParams.get("countries") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const [data, setData] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
    const fq = buildFilterQs(params);

    async function load() {
      if (!cancelled) setLoading(true);
      try {
        const res = await fetch(`${API}/tournament/${encodeURIComponent(name)}${fq ? "?" + fq : ""}`).then((r) => r.json());
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) setLoading(false);
        console.error("Failed to load tournament:", err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [name, tournaments, countries, dateFrom, dateTo]);

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

  const s = data.summary;
  const topTeams = (s.top_teams_by_wins || [])
    .slice(0, 10)
    .map((t, i) => ({
      rank: i + 1,
      name: t.team,
      value: formatNumber(t.wins),
      href: `/teams/${encodeURIComponent(t.team)}`,
    }));

  const homePct = s.matches > 0 ? (s.home_wins / s.matches) * 100 : 0;
  const awayPct = s.matches > 0 ? (s.away_wins / s.matches) * 100 : 0;
  const drawPct = s.matches > 0 ? (s.draws / s.matches) * 100 : 0;

  return (
    <div>
      <Link href="/tournaments" className="text-[14px] text-[#1A56DB] hover:underline flex items-center gap-1 mb-1">
        <ArrowLeft size={14} /> Back to Tournaments
      </Link>
      <h1 className="page-title mb-1">{data.tournament}</h1>
      <p className="text-[14px] text-[#6C757D] mb-6">
        {s.first_year} – {s.last_year} · {s.editions} editions · {s.unique_teams} teams
      </p>

      <FilterBar showTournaments showCountries showDateRange />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard label="First Edition" value={s.first_year} />
        <StatsCard label="Last Edition" value={s.last_year} />
        <StatsCard label="Editions" value={s.editions} />
        <StatsCard label="Matches" value={formatNumber(s.matches)} />
        <StatsCard label="Goals" value={formatNumber(s.total_goals)} sub={`${s.avg_goals_per_match.toFixed(2)} avg/match`} />
        <StatsCard label="Teams" value={s.unique_teams} />
        <StatsCard label="Home Win Rate" value={`${homePct.toFixed(0)}%`} subColor="success" />
        <StatsCard label="Draw Rate" value={`${drawPct.toFixed(0)}%`} subColor="warning" />
      </div>

      {/* Yearly Breakdown Chart + Table */}
      {data.yearly && data.yearly.length > 0 && (
        <div className="card p-5 mb-8">
          <h3 className="section-title mb-4">📈 Goals Per Edition</h3>
          <div className="h-[220px] flex items-end gap-[2px] px-4 pb-2 mb-4">
            {data.yearly
              .sort((a, b) => a.year - b.year)
              .map((yb) => {
                const maxGoals = Math.max(...data.yearly.map((y) => y.goals));
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
                {data.yearly
                  .sort((a, b) => b.year - a.year)
                  .map((yb) => (
                    <tr key={yb.year}>
                      <td className="font-semibold">{yb.year}</td>
                      <td>{formatNumber(yb.matches)}</td>
                      <td>{formatNumber(yb.goals)}</td>
                      <td>{yb.avg_goals.toFixed(2)}</td>
                      <td>{yb.home_wins}</td>
                      <td>{yb.away_wins}</td>
                      <td>{yb.draws}</td>
                      <td className="text-[#6C757D]">{yb.host_country}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Teams */}
      <div className="mb-8">
        <TopList title="🏆 Top Teams (by Wins)" items={topTeams} maxValue={s.top_teams_by_wins?.[0]?.wins || 1} />
      </div>
    </div>
  );
}
