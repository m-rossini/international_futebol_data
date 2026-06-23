"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { StatsCard } from "@/components/shared/StatsCard";
import { DataTable } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { TopList } from "@/components/shared/TopList";
import { formatNumber } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { TournamentDetail, TeamCategoryItem } from "@/lib/types";

const API = "/api/proxy";

const TOP_TEAM_CATEGORIES: { key: keyof TournamentDetail["summary"]["top_teams"]; label: string }[] = [
  { key: "by_wins", label: "Wins" },
  { key: "by_losses", label: "Losses" },
  { key: "by_draws", label: "Draws" },
  { key: "by_goals_for", label: "Goals For" },
  { key: "by_goals_against", label: "Goals Against" },
  { key: "by_goal_diff", label: "Goal Diff" },
];

function buildFilterQs(params: { tournaments: string; countries: string; date_from: string; date_to: string }): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function TournamentDetailClient({ name }: { name: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournaments = searchParams.get("tournaments") || "";
  const countries = searchParams.get("countries") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const [data, setData] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [topTeamCategory, setTopTeamCategory] = useState<string>("by_wins");

  useEffect(() => {

    const controller = new AbortController();
    const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
    const fq = buildFilterQs(params);

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API}/tournament/${encodeURIComponent(name)}${fq ? "?" + fq : ""}`, { signal: controller.signal }).then((r) => r.json());
        setData(res);
        setLoading(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setLoading(false);
        console.error("Failed to load tournament:", err);
      }
    }

    load();
    return () => { controller.abort(); };
  }, [name, tournaments, countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div>
        <div className="skeleton h-8 w-48 mb-2 rounded" />
        <div className="skeleton h-5 w-32 mb-6 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-4 w-20 mb-2 rounded" />
              <div className="skeleton h-10 w-24 rounded" />
            </div>
          ))}
        </div>
        <div className="card p-5 mb-6"><div className="skeleton h-[240px] rounded" /></div>
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
  const topTeamsData = (s.top_teams?.[topTeamCategory as keyof typeof s.top_teams] as TeamCategoryItem[]) || [];
  const topTeams = topTeamsData
    .slice(0, 10)
    .map((t, i) => ({
      rank: i + 1,
      name: t.team,
      value: formatNumber(t.value),
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

      <FilterBar showTournaments={false} showCountries showDateRange />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard label="First Edition" value={s.first_year} />
        <StatsCard label="Last Edition" value={s.last_year} />
        <StatsCard label="Editions" value={s.editions} />
        <StatsCard label="Matches" value={formatNumber(s.matches)} />
        <StatsCard label="Goals" value={formatNumber(s.total_goals)} sub={`${s.avg_goals_per_match.toFixed(2)} avg/match`} />
        <StatsCard label="Teams" value={s.unique_teams} />
        <StatsCard label="Home Win Rate" value={`${homePct.toFixed(0)}%`} subColor="success" />
        <StatsCard label="Away Win Rate" value={`${awayPct.toFixed(0)}%`} subColor="danger" />
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
            <DataTable
              columns={[
                { key: "year", header: "Year", sortable: true, render: (yb: typeof data.yearly[0]) => <span className="font-semibold">{yb.year}</span> },
                { key: "matches", header: "Matches", sortable: true, render: (yb: typeof data.yearly[0]) => formatNumber(yb.matches) },
                { key: "goals", header: "Goals", sortable: true, render: (yb: typeof data.yearly[0]) => formatNumber(yb.goals) },
                { key: "avg_goals", header: "Avg", sortable: true, render: (yb: typeof data.yearly[0]) => yb.avg_goals.toFixed(2) },
                { key: "home_wins", header: "Home Wins", sortable: true },
                { key: "away_wins", header: "Away Wins", sortable: true },
                { key: "draws", header: "Draws", sortable: true },
                { key: "host_country", header: "Hosts", sortable: true, render: (yb: typeof data.yearly[0]) => <span className="text-[#6C757D]">{yb.host_country}</span> },
              ]}
              data={data.yearly}
              keyField="year"
              defaultSort={{ key: "year", dir: "desc" }}
              onRowClick={(yb) => {
                router.push(
                  `/tournaments/${encodeURIComponent(name)}/${yb.year}`
                );
              }}
            />
          </div>
        </div>
      )}

      {/* Top Teams — multi-category */}
      <div className="mb-8">
        <div className="card p-5">
          <div className="flex items-center gap-3 flex-wrap mb-4">
            <span className="text-[13px] font-semibold text-[#6C757D]">Top Teams by:</span>
            <div className="flex gap-1 flex-wrap">
              {TOP_TEAM_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setTopTeamCategory(cat.key)}
                  className={`chip ${topTeamCategory === cat.key ? "active" : ""}`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
          <TopList
            title={`🏆 Top Teams (by ${TOP_TEAM_CATEGORIES.find((c) => c.key === topTeamCategory)?.label || "Wins"})`}
            items={topTeams}
            maxValue={topTeamsData[0]?.value || 1}
          />
        </div>
      </div>
    </div>
  );
}
