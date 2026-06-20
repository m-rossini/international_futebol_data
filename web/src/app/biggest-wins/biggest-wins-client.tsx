"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FilterBar } from "@/components/shared/FilterBar";
import type { BiggestWinItem } from "@/lib/types";

const API = "/api/proxy";


function buildFilterQs(params: { tournaments: string; countries: string; date_from: string; date_to: string }): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function BiggestWinsClient() {
  const searchParams = useSearchParams();
  const tournaments = searchParams.get("tournaments") || "";
  const countries = searchParams.get("countries") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const [topN, setTopN] = useState(Number(searchParams.get("top_n") || 25));
  const [wins, setWins] = useState<BiggestWinItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
    const fq = buildFilterQs(params);
    const qs = `top_n=${topN}${fq ? "&" + fq : ""}`;

    async function load() {
      if (!cancelled) setLoading(true);
      try {
        const res = await fetch(`${API}/biggest_wins?${qs}`).then((r) => r.json());
        if (!cancelled) {
          setWins(res);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) setLoading(false);
        console.error("Failed to load biggest wins:", err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [topN, tournaments, countries, dateFrom, dateTo]);

  return (
    <div>
      <h1 className="page-title mb-2">Biggest Wins</h1>
      <p className="text-[14px] text-[#6C757D] mb-4">
        Largest margin of victory in international football.
      </p>

      <FilterBar showCountries showDateRange />

      {/* Controls */}
      <div className="card p-4 mb-6 flex items-center gap-2">
        <span className="text-[13px] font-semibold text-[#6C757D]">Top:</span>
        <select
          value={topN}
          onChange={(e) => setTopN(Number(e.target.value))}
          className="border border-[#E9ECEF] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#1A56DB]"
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="card p-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 mb-3">
              <div className="skeleton h-4 w-6 rounded" />
              <div className="skeleton h-5 w-28 rounded" />
              <div className="skeleton h-5 w-32 rounded" />
              <div className="skeleton h-5 w-20 rounded ml-auto" />
              <div className="skeleton h-4 w-12 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <div className="card overflow-hidden">
          {/* Mini chart at top */}
          <div className="p-5 pb-0">
            <div className="h-[80px] flex items-end gap-[1px]">
              {wins.slice(0, 50).map((w) => {
                const maxDiff = wins[0]?.goal_diff || 1;
                const pct = (w.goal_diff / maxDiff) * 100;
                return (
                  <div
                    key={w.rank}
                    className="bg-[#DC3545] rounded-t-sm flex-1"
                    style={{ height: `${pct}%`, opacity: 0.3 + pct / 200 }}
                    title={`${w.home_team} ${w.home_score}-${w.away_score} ${w.away_team} (${w.date})`}
                  />
                );
              })}
            </div>
          </div>
          <table className="data-table w-full">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Home</th>
                <th className="text-center">Score</th>
                <th>Away</th>
                <th className="text-right">Diff</th>
                <th>Tournament</th>
              </tr>
            </thead>
            <tbody>
              {wins.map((w) => (
                <tr key={w.rank}>
                  <td className="font-bold text-[#ADB5BD]">{w.rank}</td>
                  <td className="text-[13px] text-[#6C757D]">{w.date}</td>
                  <td>
                    <Link href={`/teams/${encodeURIComponent(w.home_team)}`} className="text-[#1A56DB] hover:underline font-semibold">
                      {w.home_team}
                    </Link>
                  </td>
                  <td className="text-center font-bold text-[16px] tabular-nums">
                    <span className="text-[#198754]">{w.home_score}</span>
                    <span className="text-[#ADB5BD] mx-1">–</span>
                    <span className="text-[#DC3545]">{w.away_score}</span>
                  </td>
                  <td>
                    <Link href={`/teams/${encodeURIComponent(w.away_team)}`} className="text-[#1A56DB] hover:underline">
                      {w.away_team}
                    </Link>
                  </td>
                  <td className="text-right">
                    <span className="badge badge-loss">+{w.goal_diff}</span>
                  </td>
                  <td className="text-[13px] text-[#6C757D]">{w.tournament}</td>
                </tr>
              ))}
              {wins.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-[#ADB5BD]">No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
