"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { StatsCard } from "@/components/shared/StatsCard";
import { FilterBar } from "@/components/shared/FilterBar";
import { formatNumber } from "@/lib/utils";
import { ArrowLeft, Swords } from "lucide-react";
import type { TeamStats } from "@/lib/types";

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

export function TeamDetailClient({ name }: { name: string }) {
  const router = useRouter();
  const params = useQueryParams();
  const [team, setTeam] = useState<TeamStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const fq = buildFilterQs(params);
      const res = await fetch(`${API}/team/${encodeURIComponent(name)}${fq ? "?" + fq : ""}`).then((r) => r.json());
      setTeam(res);
    } catch (err) {
      console.error("Failed to load team:", err);
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

  if (!team) {
    return (
      <div>
        <Link href="/teams" className="text-[14px] text-[#1A56DB] hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to Teams
        </Link>
        <h1 className="page-title mb-2">Team Not Found</h1>
        <p className="text-[14px] text-[#6C757D]">No data for &quot;{name}&quot;.</p>
      </div>
    );
  }

  const goals = team.goals_for_stats || {};
  const against = team.goals_against_stats || {};

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/teams" className="text-[14px] text-[#1A56DB] hover:underline flex items-center gap-1 mb-1">
            <ArrowLeft size={14} /> Back to Teams
          </Link>
          <h1 className="page-title mb-1">{team.team}</h1>
          <p className="text-[14px] text-[#6C757D]">
            {formatNumber(team.matches)} matches · {formatNumber(team.wins)}W · {formatNumber(team.losses)}L · {formatNumber(team.draws)}D
          </p>
        </div>
        <Link
          href={`/head-to-head?team1=${encodeURIComponent(team.team)}`}
          className="flex items-center gap-2 bg-[#1A56DB] text-white rounded-lg px-4 py-2.5 text-[14px] font-semibold hover:bg-[#0D3B9E]"
        >
          <Swords size={16} /> Compare
        </Link>
      </div>

      <FilterBar showTournaments showCountries showDateRange />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Matches" value={formatNumber(team.matches)} />
        <StatsCard label="Wins" value={formatNumber(team.wins)} sub={`${team.win_rate.toFixed(1)}%`} subColor="success" />
        <StatsCard label="Losses" value={formatNumber(team.losses)} sub={`${team.loss_rate.toFixed(1)}%`} subColor="danger" />
        <StatsCard label="Draws" value={formatNumber(team.draws)} sub={`${team.draw_rate.toFixed(1)}%`} subColor="warning" />
        <StatsCard label="Goals For" value={formatNumber(team.goals_for)} sub={`Avg ${team.avg_goals_per_match.toFixed(2)}`} />
        <StatsCard label="Goals Against" value={formatNumber(team.goals_against)} />
        <StatsCard label="Goal Diff" value={team.goal_differential >= 0 ? `+${formatNumber(team.goal_differential)}` : formatNumber(team.goal_differential)}
          subColor={team.goal_differential > 0 ? "success" : team.goal_differential < 0 ? "danger" : "muted"} />
        <StatsCard label="Biggest Win" value={team.biggest_win?.score || "—"} sub={team.biggest_win ? `vs ${team.biggest_win.opponent}` : undefined} />
      </div>

      {/* Win/Loss/Draw Pie + Goals Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Match Outcomes Pie */}
        <div className="card p-5">
          <h3 className="section-title mb-4">📊 Match Outcomes</h3>
          <div className="flex items-center justify-center" style={{ height: 200 }}>
            <svg viewBox="0 0 200 200" width="180" height="180">
              <circle cx="100" cy="100" r="70" fill="none" stroke="#198754" strokeWidth="30"
                strokeDasharray={`${team.win_rate * 4.4} 440`} strokeDashoffset="0"
                transform="rotate(-90 100 100)" />
              <circle cx="100" cy="100" r="70" fill="none" stroke="#DC3545" strokeWidth="30"
                strokeDasharray={`${team.loss_rate * 4.4} 440`}
                strokeDashoffset={-team.win_rate * 4.4}
                transform="rotate(-90 100 100)" />
              <circle cx="100" cy="100" r="70" fill="none" stroke="#FD7E14" strokeWidth="30"
                strokeDasharray={`${team.draw_rate * 4.4} 440`}
                strokeDashoffset={-(team.win_rate + team.loss_rate) * 4.4}
                transform="rotate(-90 100 100)" />
            </svg>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            <div className="flex items-center gap-2 text-[13px]"><span className="w-3 h-3 rounded-sm inline-block bg-[#198754]" /> Win <b>{team.win_rate.toFixed(0)}%</b></div>
            <div className="flex items-center gap-2 text-[13px]"><span className="w-3 h-3 rounded-sm inline-block bg-[#DC3545]" /> Loss <b>{team.loss_rate.toFixed(0)}%</b></div>
            <div className="flex items-center gap-2 text-[13px]"><span className="w-3 h-3 rounded-sm inline-block bg-[#FD7E14]" /> Draw <b>{team.draw_rate.toFixed(0)}%</b></div>
          </div>
        </div>

        {/* Advanced Stats */}
        <div className="card p-5">
          <h3 className="section-title mb-4">📈 Goals For Distribution</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
              <div className="text-[12px] text-[#6C757D] mb-1">Mean GF</div>
              <div className="text-[20px] font-bold">{team.goals_for_stats?.mean?.toFixed(2) || "—"}</div>
            </div>
            <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
              <div className="text-[12px] text-[#6C757D] mb-1">Median GF</div>
              <div className="text-[20px] font-bold">{team.goals_for_stats?.median?.toFixed(1) || "—"}</div>
            </div>
            <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
              <div className="text-[12px] text-[#6C757D] mb-1">Min / Max GF</div>
              <div className="text-[20px] font-bold">{team.goals_for_stats?.min ?? "—"} / {team.goals_for_stats?.max ?? "—"}</div>
            </div>
            <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
              <div className="text-[12px] text-[#6C757D] mb-1">Std Dev</div>
              <div className="text-[20px] font-bold">{team.goals_for_stats?.std?.toFixed(2) || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Goals Against Stats */}
      {against && Object.keys(against).length > 0 && (
        <div className="card p-5 mb-8">
          <h3 className="section-title mb-4">🛡️ Goals Against Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
              <div className="text-[12px] text-[#6C757D] mb-1">Mean GA</div>
              <div className="text-[20px] font-bold">{against.mean?.toFixed(2) || "—"}</div>
            </div>
            <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
              <div className="text-[12px] text-[#6C757D] mb-1">Median GA</div>
              <div className="text-[20px] font-bold">{against.median?.toFixed(1) || "—"}</div>
            </div>
            <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
              <div className="text-[12px] text-[#6C757D] mb-1">Min / Max GA</div>
              <div className="text-[20px] font-bold">{against.min ?? "—"} / {against.max ?? "—"}</div>
            </div>
            <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
              <div className="text-[12px] text-[#6C757D] mb-1">IQR</div>
              <div className="text-[20px] font-bold">{against.iqr?.toFixed(2) || "—"}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
