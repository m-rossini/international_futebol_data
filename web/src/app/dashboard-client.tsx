"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { StatsCard } from "@/components/shared/StatsCard";
import { TopList } from "@/components/shared/TopList";
import { FilterBar } from "@/components/shared/FilterBar";
import { formatNumber } from "@/lib/utils";
import type { SummaryResponse, TeamRankingItem } from "@/lib/types";

// Serverless-friendly approach — fetch from proxy
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

export function DashboardClient() {
  const params = useQueryParams();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [topTeams, setTopTeams] = useState<TeamRankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const fq = buildFilterQs(params);
      const [summaryRes, teamsRes] = await Promise.all([
        fetch(`${API}/summary${fq ? "?" + fq : ""}`).then((r) => r.json()),
        fetch(`${API}/most/wins?top_n=10${fq ? "&" + fq : ""}`).then((r) => r.json()),
      ]);
      setSummary(summaryRes);
      setTopTeams(teamsRes.teams || []);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    }
    setLoading(false);
  }, [params.tournaments, params.countries, params.date_from, params.date_to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div>
        <h1 className="page-title mb-2">Dashboard</h1>
        <p className="text-[14px] text-[#6C757D] mb-4">Loading...</p>
      </div>
    );
  }

  const meta = summary?.results_metadata;

  return (
    <div>
      <h1 className="page-title mb-2">Dashboard</h1>
      <p className="text-[14px] text-[#6C757D] mb-4">
        Overview of the entire dataset. Use filters to narrow the scope.
      </p>

      <FilterBar showTournaments showCountries showDateRange />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatsCard label="Total Matches" value={meta ? formatNumber(meta.total_matches) : "—"} sub="All recorded matches" />
        <StatsCard label="Total Goals" value={meta ? formatNumber(meta.total_goals) : "—"} sub={`${meta?.avg_goals_per_match.toFixed(2) || "—"} avg/match`} />
        <StatsCard label="Tournaments" value={meta?.total_tournaments ?? "—"} sub="Across all eras" />
        <StatsCard label="Countries" value={meta?.total_countries ?? "—"} sub="Host nations" />
        <StatsCard label="Teams" value={meta?.total_teams ?? "—"} sub="National & club" />
        <StatsCard label="Scorers" value={meta?.unique_scorers ? formatNumber(meta.unique_scorers) : "—"} sub="All time" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Goals Over Time */}
        <div className="card p-5">
          <h3 className="section-title mb-4">📈 Goals Over Time</h3>
          <div className="h-[240px] flex items-end gap-[2px] px-4 pb-2">
            {meta?.match_distribution &&
              Object.entries(meta.match_distribution)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([year, val], i) => {
                  const maxVal = Math.max(...Object.values(meta.match_distribution));
                  const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                  return (
                    <div
                      key={year}
                      className="bg-[#1A56DB] rounded-t-sm flex-1"
                      style={{ height: `${pct}%`, opacity: 0.5 + pct / 200 }}
                      title={`${year}: ${val} matches`}
                    />
                  );
                })}
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-[#ADB5BD]">
            <span>{meta ? Object.keys(meta.match_distribution).sort()[0]?.split("-")[0] : ""}</span>
            <span>{meta ? Object.keys(meta.match_distribution).sort().slice(-1)[0]?.split("-")[0] : ""}</span>
          </div>
        </div>

        {/* Win/Loss/Draw — SVG pie */}
        <div className="card p-5">
          <h3 className="section-title mb-4">📊 Match Outcomes</h3>
          {meta && (
            <>
              <div className="flex items-center justify-center" style={{ height: 200 }}>
                <svg viewBox="0 0 200 200" width="180" height="180">
                  <circle cx="100" cy="100" r="70" fill="none" stroke="#198754" strokeWidth="30"
                    strokeDasharray={`${meta.home_win_pct * 4.4} 440`} strokeDashoffset="0"
                    transform="rotate(-90 100 100)" />
                  <circle cx="100" cy="100" r="70" fill="none" stroke="#DC3545" strokeWidth="30"
                    strokeDasharray={`${meta.away_win_pct * 4.4} 440`}
                    strokeDashoffset={-meta.home_win_pct * 4.4}
                    transform="rotate(-90 100 100)" />
                  <circle cx="100" cy="100" r="70" fill="none" stroke="#FD7E14" strokeWidth="30"
                    strokeDasharray={`${meta.draw_pct * 4.4} 440`}
                    strokeDashoffset={-(meta.home_win_pct + meta.away_win_pct) * 4.4}
                    transform="rotate(-90 100 100)" />
                </svg>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="w-3 h-3 rounded-sm inline-block bg-[#198754]" /> Home Win <b>{meta.home_win_pct.toFixed(0)}%</b>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="w-3 h-3 rounded-sm inline-block bg-[#DC3545]" /> Away Win <b>{meta.away_win_pct.toFixed(0)}%</b>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="w-3 h-3 rounded-sm inline-block bg-[#FD7E14]" /> Draw <b>{meta.draw_pct.toFixed(0)}%</b>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {meta && (
          <TopList
            title="🏆 Top Tournaments"
            viewAllHref="/tournaments"
            items={Object.entries(meta.tournament_distribution)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([name, val], i) => ({ rank: i + 1, name, value: formatNumber(val), sub: "matches" }))}
          />
        )}
        {meta && (
          <TopList
            title="🌍 Top Countries"
            viewAllHref="/countries"
            items={Object.entries(meta.country_distribution)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([name, val], i) => ({ rank: i + 1, name, value: formatNumber(val), sub: "matches" }))}
          />
        )}
      </div>

      {/* Top Teams bar chart */}
      <div className="card p-5 mb-8">
        <h3 className="section-title mb-4">👥 Top Teams (by Wins)</h3>
        <div className="space-y-3">
          {topTeams.slice(0, 10).map((t, i) => (
            <div key={t.team} className="flex items-center gap-3">
              <span className="text-[#ADB5BD] font-bold text-[13px] w-6">{i + 1}</span>
              <span className="text-[14px] w-32 truncate">{t.team}</span>
              <div className="flex-1 h-6 bg-[#F8F9FA] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1A56DB] rounded-full"
                  style={{ width: `${Math.min(100, (t.value / (topTeams[0]?.value || 1)) * 100)}%` }}
                />
              </div>
              <span className="text-[14px] font-semibold w-16 text-right">{formatNumber(t.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
