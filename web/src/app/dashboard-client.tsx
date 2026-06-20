"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatsCard } from "@/components/shared/StatsCard";
import { TopList } from "@/components/shared/TopList";
import { FilterBar } from "@/components/shared/FilterBar";
import { formatNumber, getFlagUrl } from "@/lib/utils";
import type { SummaryResponse, TeamRankingItem } from "@/lib/types";

const API = "/api/proxy";

function buildFilterQs(params: { tournaments: string; countries: string; date_from: string; date_to: string }): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function DashboardClient() {
  const sp = useSearchParams();
  const tournaments = sp.get("tournaments") || "";
  const countries = sp.get("countries") || "";
  const dateFrom = sp.get("date_from") || "";
  const dateTo = sp.get("date_to") || "";
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [topTeams, setTopTeams] = useState<TeamRankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
    const fq = buildFilterQs(params);

    async function load() {
      if (!cancelled) setLoading(true);
      try {
        const [summaryRes, teamsRes] = await Promise.all([
          fetch(`${API}/summary${fq ? "?" + fq : ""}`).then((r) => r.json()),
          fetch(`${API}/most/wins?top_n=10${fq ? "&" + fq : ""}`).then((r) => r.json()),
        ]);
        if (!cancelled) {
          setSummary(summaryRes);
          // /most/wins returns { stat, top_n, ranking: [{ team, wins }] }
          const rawRanking = (teamsRes.ranking || []) as Array<Record<string, unknown>>;
          const mapped: TeamRankingItem[] = rawRanking.map((item, idx) => ({
            rank: idx + 1,
            team: String(item.team || ""),
            value: Number((item as Record<string, number>).wins ?? 0),
          }));
          setTopTeams(mapped);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) setLoading(false);
        console.error("Failed to load dashboard data:", err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tournaments, countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div>
        <h1 className="page-title mb-2">Dashboard</h1>
        <p className="text-[14px] text-[#6C757D] mb-4">Loading...</p>
      </div>
    );
  }

  const r = summary?.results;
  const g = summary?.goalscorers;
  const ha = r?.home_advantage;

  return (
    <div>
      <h1 className="page-title mb-2">Dashboard</h1>
      <p className="text-[14px] text-[#6C757D] mb-4">
        Overview of the entire dataset. Use filters to narrow the scope.
      </p>

      <FilterBar showCountries showDateRange />

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatsCard label="Total Matches" value={r ? formatNumber(r.total_matches) : "—"} sub="All recorded matches" />
        <StatsCard label="Total Goals" value={r ? formatNumber(r.total_goals) : "—"} sub={`${r?.avg_goals_per_match.toFixed(2) || "—"} avg/match`} />
        <StatsCard label="Tournaments" value={r?.tournaments_count ?? "—"} sub="Across all eras" />
        <StatsCard label="Home Teams" value={r?.unique_home_teams ?? "—"} sub="Unique home sides" />
        <StatsCard label="Away Teams" value={r?.unique_away_teams ?? "—"} sub="Unique away sides" />
        <StatsCard label="Scorers" value={g?.unique_scorers ? formatNumber(g.unique_scorers) : "—"} sub="All time" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Matches Over Time */}
        <div className="card p-5">
          <h3 className="section-title mb-4">📈 Matches Per Year</h3>
          {r?.match_distribution?.matches_per_year && (
            <>
              <div className="h-[240px] flex items-end gap-[2px] px-4 pb-2">
                {Object.entries(r.match_distribution.matches_per_year)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([year, val]) => {
                    const maxVal = Math.max(...Object.values(r.match_distribution.matches_per_year));
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
                <span>{Object.keys(r.match_distribution.matches_per_year).sort()[0]}</span>
                <span>{Object.keys(r.match_distribution.matches_per_year).sort().slice(-1)[0]}</span>
              </div>
            </>
          )}
        </div>

        {/* Win/Loss/Draw — SVG pie */}
        <div className="card p-5">
          <h3 className="section-title mb-4">📊 Match Outcomes</h3>
          {ha && (
            <>
              <div className="flex items-center justify-center" style={{ height: 200 }}>
                <svg viewBox="0 0 200 200" width="180" height="180">
                  <circle cx="100" cy="100" r="70" fill="none" stroke="#198754" strokeWidth="30"
                    strokeDasharray={`${ha.home_win_pct * 4.4} 440`} strokeDashoffset="0"
                    transform="rotate(-90 100 100)" />
                  <circle cx="100" cy="100" r="70" fill="none" stroke="#DC3545" strokeWidth="30"
                    strokeDasharray={`${ha.away_win_pct * 4.4} 440`}
                    strokeDashoffset={-ha.home_win_pct * 4.4}
                    transform="rotate(-90 100 100)" />
                  <circle cx="100" cy="100" r="70" fill="none" stroke="#FD7E14" strokeWidth="30"
                    strokeDasharray={`${ha.draw_pct * 4.4} 440`}
                    strokeDashoffset={-(ha.home_win_pct + ha.away_win_pct) * 4.4}
                    transform="rotate(-90 100 100)" />
                </svg>
              </div>
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="w-3 h-3 rounded-sm inline-block bg-[#198754]" /> Home Win <b>{ha.home_win_pct.toFixed(0)}%</b>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="w-3 h-3 rounded-sm inline-block bg-[#DC3545]" /> Away Win <b>{ha.away_win_pct.toFixed(0)}%</b>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="w-3 h-3 rounded-sm inline-block bg-[#FD7E14]" /> Draw <b>{ha.draw_pct.toFixed(0)}%</b>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {r?.match_distribution?.matches_per_tournament && (
          <TopList
            title="🏆 Top Tournaments"
            viewAllHref="/tournaments"
            items={Object.entries(r.match_distribution.matches_per_tournament)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([name, val], i) => ({ rank: i + 1, name, value: formatNumber(val), sub: "matches" }))}
          />
        )}
        {g && (
          <div className="card p-5">
            <h3 className="section-title mb-4">⚽ Goalscorers</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
                <div className="text-[18px] font-bold">{formatNumber(g.unique_scorers)}</div>
                <div className="text-[12px] text-[#6C757D]">Unique Scorers</div>
              </div>
              <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
                <div className="text-[18px] font-bold">{formatNumber(g.own_goals)}</div>
                <div className="text-[12px] text-[#6C757D]">Own Goals</div>
              </div>
              <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
                <div className="text-[18px] font-bold">{formatNumber(g.total_goals_recorded)}</div>
                <div className="text-[12px] text-[#6C757D]">Goals Recorded</div>
              </div>
              <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
                <div className="text-[18px] font-bold">{g.unique_teams_scored_for}</div>
                <div className="text-[12px] text-[#6C757D]">Teams Scored For</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Teams bar chart */}
      <div className="card p-5 mb-8">
        <h3 className="section-title mb-4">👥 Top Teams (by Wins)</h3>
        <div className="space-y-3">
          {topTeams.slice(0, 10).map((t, i) => (
            <div key={t.team} className="flex items-center gap-3">
              <span className="text-[#ADB5BD] font-bold text-[13px] w-6">{i + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={getFlagUrl(t.team, 24)} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
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
