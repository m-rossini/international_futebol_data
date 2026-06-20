"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/shared/FilterBar";
import { TopList } from "@/components/shared/TopList";
import { formatNumber } from "@/lib/utils";
import type { TeamRankingItem } from "@/lib/types";

const API = "/api/proxy";

const STATS = [
  { value: "wins", label: "Wins" },
  { value: "losses", label: "Losses" },
  { value: "draws", label: "Draws" },
  { value: "win_rate", label: "Win Rate" },
  { value: "loss_rate", label: "Loss Rate" },
  { value: "goals_pro", label: "Goals For" },
  { value: "goals_against", label: "Goals Against" },
  { value: "matches", label: "Matches" },
];


function buildFilterQs(params: { tournaments: string; countries: string; date_from: string; date_to: string }): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function RankingsClient() {
  const searchParams = useSearchParams();
  const sp = useSearchParams();
  const params = useMemo(() => ({
    tournaments: sp.get("tournaments") || "",
    countries: sp.get("countries") || "",
    date_from: sp.get("date_from") || "",
    date_to: sp.get("date_to") || "",
  }), [sp]);
  const [stat, setStat] = useState(searchParams.get("stat") || "wins");
  const [topN, setTopN] = useState(Number(searchParams.get("top_n") || 20));
  const [teams, setTeams] = useState<TeamRankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const fq = buildFilterQs(params);
      const qs = `top_n=${topN}${fq ? "&" + fq : ""}`;
      const res = await fetch(`${API}/most/${stat}?${qs}`).then((r) => r.json());
      setTeams(res.teams || []);
    } catch (err) {
      console.error("Failed to load rankings:", err);
    }
    setLoading(false);
  }, [stat, topN, params.tournaments, params.countries, params.date_from, params.date_to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update URL when stat/topN changes
  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("stat", stat);
    url.searchParams.set("top_n", String(topN));
    window.history.replaceState(null, "", url.toString());
  }, [stat, topN]);

  const items = teams.map((t) => ({
    rank: t.rank,
    name: t.team,
    value: formatNumber(t.value),
    href: `/teams/${encodeURIComponent(t.team)}`,
  }));

  return (
    <div>
      <h1 className="page-title mb-2">Rankings</h1>
      <p className="text-[14px] text-[#6C757D] mb-4">
        Top {topN} teams by selected statistic.
      </p>

      <FilterBar showTournaments showCountries showDateRange />

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#6C757D]">Stat:</span>
            <div className="flex gap-1 flex-wrap">
              {STATS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStat(s.value)}
                  className={`chip ${stat === s.value ? "active" : ""}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[13px] font-semibold text-[#6C757D]">Top:</span>
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="border border-[#E9ECEF] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#1A56DB]"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card p-5">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 mb-3">
              <div className="skeleton h-4 w-6 rounded" />
              <div className="skeleton h-5 w-32 rounded" />
              <div className="skeleton h-6 flex-1 rounded" />
              <div className="skeleton h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <TopList
          title={`${STATS.find((s) => s.value === stat)?.label || stat} Rankings`}
          items={items}
          maxValue={items[0] ? Number(items[0].value) : 1}
          barColor="#1A56DB"
        />
      )}
    </div>
  );
}
