"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { StatsCard } from "@/components/shared/StatsCard";
import { FilterBar } from "@/components/shared/FilterBar";
import { DecadeChart } from "@/components/shared/DecadeChart";
import { formatNumber, getFlagUrl } from "@/lib/utils";
import type { SummaryResponse, TeamRankingItem, GoalsPerYearItem } from "@/lib/types";

const API = "/api/proxy";

const TOP_TEAM_CATEGORIES: { key: string; label: string; valueKey: string }[] = [
  { key: "wins", label: "Wins", valueKey: "wins" },
  { key: "losses", label: "Losses", valueKey: "losses" },
  { key: "draws", label: "Draws", valueKey: "draws" },
  { key: "goals_pro", label: "Goals For", valueKey: "goals_for" },
  { key: "goals_against", label: "Goals Against", valueKey: "goals_against" },
];

function buildQs(params: { tournaments: string; countries: string; date_from: string; date_to: string }): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

// ── decade aggregation ──
interface DecadeDatum {
  decade: string;
  matches: number;
  goals: number;
}

function buildDecades(yearly: GoalsPerYearItem[]): DecadeDatum[] {
  const map = new Map<number, { matches: number; goals: number }>();
  yearly.forEach((y) => {
    const d = Math.floor(y.year / 10) * 10;
    if (!map.has(d)) map.set(d, { matches: 0, goals: 0 });
    const e = map.get(d)!;
    e.matches += y.matches;
    e.goals += y.goals;
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([decade, v]) => ({ decade: `${decade}s`, ...v }));
}

export function DashboardClient() {
  const sp = useSearchParams();
  const tournaments = sp.get("tournaments") || "";
  const countries = sp.get("countries") || "";
  const dateFrom = sp.get("date_from") || "";
  const dateTo = sp.get("date_to") || "";

  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [topTeams, setTopTeams] = useState<TeamRankingItem[]>([]);
  const [topTeamCategory, setTopTeamCategory] = useState<string>("wins");
  const [yearlyData, setYearlyData] = useState<GoalsPerYearItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
    const fq = buildQs(params);
    const cat = TOP_TEAM_CATEGORIES.find((c) => c.key === topTeamCategory) || TOP_TEAM_CATEGORIES[0];

    async function load() {
      if (!cancelled) setLoading(true);
      try {
        const [summaryRes, teamsRes, gpyRes] = await Promise.all([
          fetch(`${API}/summary${fq ? "?" + fq : ""}`).then((r) => r.json()),
          fetch(`${API}/most/${cat.key}?top_n=10${fq ? "&" + fq : ""}`).then((r) => r.json()),
          fetch(`${API}/goals_per_year?sort_by=year&order=asc${fq ? "&" + fq : ""}`).then((r) => r.json()),
        ]);
        if (!cancelled) {
          setSummary(summaryRes);
          setYearlyData(gpyRes || []);
          const rawRanking = (teamsRes.ranking || []) as Array<Record<string, unknown>>;
          const mapped: TeamRankingItem[] = rawRanking.map((item, idx) => ({
            rank: idx + 1,
            team: String(item.team || ""),
            value: Number((item as Record<string, number>)[cat.valueKey] ?? 0),
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
  }, [tournaments, countries, dateFrom, dateTo, topTeamCategory]);

  const decades = useMemo(() => buildDecades(yearlyData), [yearlyData]);

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

  // max for bar scaling
  const maxDecadeMatches = decades.length > 0 ? Math.max(...decades.map((d) => d.matches)) : 1;
  const maxDecadeGoals = decades.length > 0 ? Math.max(...decades.map((d) => d.goals)) : 1;

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

      {/* Scoring Rate by Decade */}
      {yearlyData.length > 0 && (
        <div className="card p-5 mb-8">
          <h3 className="section-title mb-2">⚽ Goals per Match by Decade</h3>
          <p className="text-[12px] text-[#ADB5BD] mb-1">
            How scoring rate has changed over time · dashed line = all-time average
          </p>
          <DecadeChart yearly={yearlyData} />
        </div>
      )}

      {/* Side-by-side: Match Outcomes + Matches by Decade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Match Outcomes pie */}
        <div className="card p-5">
          <h3 className="section-title mb-4">📊 Match Outcomes</h3>
          {ha && (
            <>
              <div className="flex items-center justify-center" style={{ height: 200 }}>
                <svg viewBox="0 0 200 200" width="170" height="170">
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

        {/* Matches & Goals by Decade — stacked bar chart */}
        <div className="card p-5">
          <h3 className="section-title mb-2">📅 Matches &amp; Goals by Decade</h3>
          <p className="text-[11px] text-[#ADB5BD] mb-3">Top label: matches · Bottom: total goals</p>
          {decades.length > 0 && (
            <>
              <div className="h-[190px] flex items-end gap-[3px] px-3 pb-1">
                {decades.map((d) => {
                  const matchPct = (d.matches / maxDecadeMatches) * 100;
                  const goalPct = (d.goals / maxDecadeGoals) * 100;
                  return (
                    <div key={d.decade} className="flex-1 flex flex-col items-center gap-0.5" title={`${d.decade}: ${formatNumber(d.matches)} matches, ${formatNumber(d.goals)} goals`}>
                      <span className="text-[9px] text-[#6C757D] leading-none">{formatNumber(d.matches)}</span>
                      <div className="w-full flex flex-col justify-end" style={{ height: 155 }}>
                        <div
                          className="w-full bg-[#1A56DB] rounded-t-sm"
                          style={{ height: `${Math.max(3, matchPct)}%`, opacity: 0.65 + matchPct / 300 }}
                        />
                        <div
                          className="w-full bg-[#DC3545] rounded-t-sm"
                          style={{ height: `${Math.max(3, goalPct)}%`, opacity: 0.5 + goalPct / 300 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 px-3">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[11px]"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#1A56DB]" /> Matches</div>
                  <div className="flex items-center gap-1.5 text-[11px]"><span className="w-2.5 h-2.5 rounded-sm inline-block bg-[#DC3545]" /> Goals</div>
                </div>
                <div className="flex gap-6 text-[11px] text-[#ADB5BD]">
                  {decades.filter((_, i) => i === 0 || i === decades.length - 1).map((d) => (
                    <span key={d.decade}>{d.decade}</span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Top Teams — multi-category */}
      <div className="card p-5 mb-8">
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
