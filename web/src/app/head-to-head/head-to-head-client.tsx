"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FilterBar } from "@/components/shared/FilterBar";
import { StatsCard } from "@/components/shared/StatsCard";
import { formatNumber } from "@/lib/utils";
import { Swords, Search } from "lucide-react";
import type { HeadToHeadResponse } from "@/lib/types";

const API = "/api/proxy";


function buildFilterQs(params: { tournaments: string; countries: string; date_from: string; date_to: string }): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function HeadToHeadClient() {
  const searchParams = useSearchParams();
  const tournaments = searchParams.get("tournaments") || "";
  const countries = searchParams.get("countries") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const [team1, setTeam1] = useState(searchParams.get("team1") || "");
  const [team2, setTeam2] = useState(searchParams.get("team2") || "");
  const [data, setData] = useState<HeadToHeadResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fetchedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!team1.trim() || !team2.trim()) return;
    setLoading(true);
    setError("");
    try {
      const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
      const fq = buildFilterQs(params);
      const qs = `team1=${encodeURIComponent(team1.trim())}&team2=${encodeURIComponent(team2.trim())}${fq ? "&" + fq : ""}`;
      const res = await fetch(`${API}/head_to_head?${qs}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      const json = await res.json();
      // API uses team names as key prefixes (e.g. Brazil_wins, Argentina_goals)
      const t1 = json.team1 as string;
      const t2 = json.team2 as string;
      const t1_wins = (json as Record<string, number>)[`${t1}_wins`] ?? 0;
      const t2_wins = (json as Record<string, number>)[`${t2}_wins`] ?? 0;
      const t1_goals = (json as Record<string, number>)[`${t1}_goals`] ?? 0;
      const t2_goals = (json as Record<string, number>)[`${t2}_goals`] ?? 0;
      const totalMatches = (json.matches as number) || (t1_wins + t2_wins + (json.draws as number));
      setData({
        team1: t1,
        team2: t2,
        team1_wins: t1_wins,
        team2_wins: t2_wins,
        draws: json.draws as number,
        total_matches: totalMatches,
        team1_goals: t1_goals,
        team2_goals: t2_goals,
        team1_win_rate: totalMatches > 0 ? (t1_wins / totalMatches) * 100 : 0,
        team2_win_rate: totalMatches > 0 ? (t2_wins / totalMatches) * 100 : 0,
        team1_avg_goals: totalMatches > 0 ? t1_goals / totalMatches : 0,
        team2_avg_goals: totalMatches > 0 ? t2_goals / totalMatches : 0,
        total_goals_per_match_stats: json.total_goals_per_match_stats as HeadToHeadResponse["total_goals_per_match_stats"],
      });
    } catch (err) {
      console.error("Failed to load head-to-head:", err);
      setError("Failed to load comparison. Check that both team names are correct.");
      setData(null);
    }
    setLoading(false);
  }, [team1, team2, tournaments, countries, dateFrom, dateTo]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    if (team1 && team2) fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCompare = () => {
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set("team1", team1.trim());
    url.searchParams.set("team2", team2.trim());
    window.history.replaceState(null, "", url.toString());
    fetchData();
  };

  return (
    <div>
      <h1 className="page-title mb-2">Head-to-Head</h1>
      <p className="text-[14px] text-[#6C757D] mb-4">
        Compare two teams against each other.
      </p>

      <FilterBar showCountries showDateRange />

      {/* Team Selection */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
          <div className="flex-1">
            <label className="text-[13px] font-semibold text-[#6C757D] block mb-1">Team 1</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ADB5BD]" />
              <input
                type="text"
                value={team1}
                onChange={(e) => setTeam1(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCompare()}
                placeholder="e.g. Brazil"
                className="w-full border border-[#E9ECEF] rounded-lg pl-9 pr-4 py-2.5 text-[15px] focus:outline-none focus:border-[#1A56DB] focus:shadow-[0_0_0_3px_#E8F0FE]"
              />
            </div>
          </div>
          <div className="flex items-center pt-5">
            <Swords size={24} className="text-[#ADB5BD]" />
          </div>
          <div className="flex-1">
            <label className="text-[13px] font-semibold text-[#6C757D] block mb-1">Team 2</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ADB5BD]" />
              <input
                type="text"
                value={team2}
                onChange={(e) => setTeam2(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCompare()}
                placeholder="e.g. Argentina"
                className="w-full border border-[#E9ECEF] rounded-lg pl-9 pr-4 py-2.5 text-[15px] focus:outline-none focus:border-[#1A56DB] focus:shadow-[0_0_0_3px_#E8F0FE]"
              />
            </div>
          </div>
          <div className="pt-5">
            <button
              onClick={handleCompare}
              disabled={!team1.trim() || !team2.trim()}
              className="bg-[#1A56DB] text-white rounded-lg px-6 py-2.5 text-[14px] font-semibold hover:bg-[#0D3B9E] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Compare
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-[#FADBD8] text-[#DC3545] rounded-lg text-[14px]">{error}</div>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="card p-5">
          <div className="flex items-center justify-center py-12">
            <div className="text-[14px] text-[#6C757D]">Loading comparison...</div>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Matchup Summary */}
          <div className="card p-6 mb-6">
            <div className="text-center mb-6">
              <h2 className="text-[24px] font-bold text-[#212529]">
                <Link href={`/teams/${encodeURIComponent(data.team1)}`} className="hover:text-[#1A56DB]">
                  {data.team1}
                </Link>
                <span className="text-[#ADB5BD] mx-3">vs</span>
                <Link href={`/teams/${encodeURIComponent(data.team2)}`} className="hover:text-[#1A56DB]">
                  {data.team2}
                </Link>
              </h2>
              <p className="text-[14px] text-[#6C757D] mt-1">{formatNumber(data.total_matches)} matches played</p>
            </div>

            {/* Side-by-side stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team 1 */}
              <div className="bg-[#F8F9FA] rounded-xl p-5">
                <h3 className="text-[16px] font-semibold text-[#1A56DB] mb-4">{data.team1}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Wins</span>
                    <span className="font-bold text-[#198754]">{data.team1_wins}</span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Win Rate</span>
                    <span className="font-bold">{data.team1_win_rate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Goals</span>
                    <span className="font-bold">{formatNumber(data.team1_goals)}</span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Avg Goals/Match</span>
                    <span className="font-bold">{data.team1_avg_goals.toFixed(2)}</span>
                  </div>
                </div>
                {/* Win rate bar */}
                <div className="mt-4 h-2 bg-[#E9ECEF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1A56DB] rounded-full"
                    style={{ width: `${data.team1_win_rate}%` }}
                  />
                </div>
              </div>

              {/* Team 2 */}
              <div className="bg-[#F8F9FA] rounded-xl p-5">
                <h3 className="text-[16px] font-semibold text-[#E83E8C] mb-4">{data.team2}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Wins</span>
                    <span className="font-bold text-[#198754]">{data.team2_wins}</span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Win Rate</span>
                    <span className="font-bold">{data.team2_win_rate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Goals</span>
                    <span className="font-bold">{formatNumber(data.team2_goals)}</span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Avg Goals/Match</span>
                    <span className="font-bold">{data.team2_avg_goals.toFixed(2)}</span>
                  </div>
                </div>
                {/* Win rate bar */}
                <div className="mt-4 h-2 bg-[#E9ECEF] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#E83E8C] rounded-full"
                    style={{ width: `${data.team2_win_rate}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Draws */}
            <div className="mt-6 text-center">
              <div className="text-[14px] text-[#6C757D]">Draws</div>
              <div className="text-[28px] font-bold text-[#FD7E14]">{data.draws}</div>
              <div className="text-[13px] text-[#ADB5BD]">
                {((data.draws / data.total_matches) * 100).toFixed(1)}% of matches
              </div>
            </div>
          </div>

          {/* Advanced Stats */}
          {data.total_goals_per_match_stats && (
            <div className="card p-5 mb-6">
              <h3 className="section-title mb-4">📊 Total Goals Per Match Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
                  <div className="text-[12px] text-[#6C757D] mb-1">Mean</div>
                  <div className="text-[20px] font-bold">{data.total_goals_per_match_stats.mean?.toFixed(2) || "—"}</div>
                </div>
                <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
                  <div className="text-[12px] text-[#6C757D] mb-1">Median</div>
                  <div className="text-[20px] font-bold">{data.total_goals_per_match_stats.median?.toFixed(1) || "—"}</div>
                </div>
                <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
                  <div className="text-[12px] text-[#6C757D] mb-1">Min / Max</div>
                  <div className="text-[20px] font-bold">{data.total_goals_per_match_stats.min ?? "—"} / {data.total_goals_per_match_stats.max ?? "—"}</div>
                </div>
                <div className="text-center p-3 bg-[#F8F9FA] rounded-lg">
                  <div className="text-[12px] text-[#6C757D] mb-1">Std Dev</div>
                  <div className="text-[20px] font-bold">{data.total_goals_per_match_stats.std?.toFixed(2) || "—"}</div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!data && !loading && (
        <div className="card p-12 text-center">
          <Swords size={48} className="mx-auto text-[#ADB5BD] mb-4" />
          <h3 className="text-[16px] font-semibold text-[#6C757D] mb-2">Compare Two Teams</h3>
          <p className="text-[14px] text-[#ADB5BD]">
            Enter two team names above and click Compare to see their head-to-head record.
          </p>
        </div>
      )}
    </div>
  );
}
