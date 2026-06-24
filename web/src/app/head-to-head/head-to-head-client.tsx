"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FilterBar } from "@/components/shared/FilterBar";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";
import { formatNumber, getFlagUrl } from "@/lib/utils";
import { useFilterHref } from "@/lib/use-filter-href";
import { getFilterOptions } from "@/lib/api";
import { Swords } from "lucide-react";
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
  const to = useFilterHref();
  const [teams, setTeams] = useState<string[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const teamsLoaded = useRef(false);

  // Pre-load team names for autocomplete
  useEffect(() => {
    if (teamsLoaded.current) return;
    teamsLoaded.current = true;
    getFilterOptions()
      .then((o) => { setTeams(o.teams || []); setTeamsLoading(false); })
      .catch(() => { setTeamsLoading(false); });
  }, []);

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
        team1_losses: t2_wins,
        team2_losses: t1_wins,
        team1_goals: t1_goals,
        team2_goals: t2_goals,
        team1_win_rate: totalMatches > 0 ? (t1_wins / totalMatches) * 100 : 0,
        team2_win_rate: totalMatches > 0 ? (t2_wins / totalMatches) * 100 : 0,
        team1_loss_rate: totalMatches > 0 ? (t2_wins / totalMatches) * 100 : 0,
        team2_loss_rate: totalMatches > 0 ? (t1_wins / totalMatches) * 100 : 0,
        team1_draw_rate: totalMatches > 0 ? ((json.draws as number) / totalMatches) * 100 : 0,
        team2_draw_rate: totalMatches > 0 ? ((json.draws as number) / totalMatches) * 100 : 0,
        team1_avg_goals: totalMatches > 0 ? t1_goals / totalMatches : 0,
        team2_avg_goals: totalMatches > 0 ? t2_goals / totalMatches : 0,
        matches_list: (json.matches_list as HeadToHeadResponse["matches_list"]) || [],
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
            <AutocompleteInput
              id="h2h-team1"
              placeholder="e.g. Brazil"
              options={teams}
              value={team1}
              onChange={setTeam1}
              loading={teamsLoading}
            />
          </div>
          <div className="flex items-center pt-5">
            <Swords size={24} className="text-[#ADB5BD]" />
          </div>
          <div className="flex-1">
            <label className="text-[13px] font-semibold text-[#6C757D] block mb-1">Team 2</label>
            <AutocompleteInput
              id="h2h-team2"
              placeholder="e.g. Argentina"
              options={teams}
              value={team2}
              onChange={setTeam2}
              loading={teamsLoading}
            />
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
              <h2 className="text-[24px] font-bold text-[#212529] flex items-center justify-center gap-2 flex-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getFlagUrl(data.team1, 24)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
                <Link href={to(`/teams/${encodeURIComponent(data.team1)}`)} className="hover:text-[#1A56DB]">
                  {data.team1}
                </Link>
                <span className="text-[#ADB5BD] mx-3">vs</span>
                <Link href={to(`/teams/${encodeURIComponent(data.team2)}`)} className="hover:text-[#1A56DB]">
                  {data.team2}
                </Link>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={getFlagUrl(data.team2, 24)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
              </h2>
              <p className="text-[14px] text-[#6C757D] mt-1">{formatNumber(data.total_matches)} matches played</p>
            </div>

            {/* Side-by-side stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Team 1 */}
              <div className="bg-[#F8F9FA] rounded-xl p-5">
                <h3 className="text-[16px] font-semibold text-[#1A56DB] mb-4 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getFlagUrl(data.team1, 24)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
                  {data.team1}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Wins</span>
                    <span className="font-bold text-[#198754]">{data.team1_wins} <span className="font-normal text-[#ADB5BD] text-[12px] ml-1">{data.team1_win_rate.toFixed(0)}%</span></span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Losses</span>
                    <span className="font-bold text-[#DC3545]">{data.team1_losses} <span className="font-normal text-[#ADB5BD] text-[12px] ml-1">{data.team1_loss_rate.toFixed(0)}%</span></span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Draws</span>
                    <span className="font-bold text-[#FD7E14]">{data.draws} <span className="font-normal text-[#ADB5BD] text-[12px] ml-1">{data.team1_draw_rate.toFixed(0)}%</span></span>
                  </div>
                  <div className="border-t border-[#E9ECEF] pt-3 mt-3">
                    <div className="flex justify-between text-[14px]">
                      <span className="text-[#6C757D]">Goals</span>
                      <span className="font-bold">{formatNumber(data.team1_goals)}</span>
                    </div>
                    <div className="flex justify-between text-[14px] mt-2">
                      <span className="text-[#6C757D]">Avg Goals/Match</span>
                      <span className="font-bold">{data.team1_avg_goals.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                {/* Stacked bar: wins (blue) | draws (orange) | losses (red) */}
                <div className="mt-4 h-2 bg-[#E9ECEF] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#1A56DB]"
                    style={{ width: `${data.team1_win_rate}%` }}
                  />
                  <div
                    className="h-full bg-[#FD7E14]"
                    style={{ width: `${data.team1_draw_rate}%` }}
                  />
                  <div
                    className="h-full bg-[#DC3545]"
                    style={{ width: `${data.team1_loss_rate}%` }}
                  />
                </div>
                <div className="flex justify-center gap-4 mt-2 text-[11px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#1A56DB] inline-block" /> W {data.team1_win_rate.toFixed(0)}%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#FD7E14] inline-block" /> D {data.team1_draw_rate.toFixed(0)}%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#DC3545] inline-block" /> L {data.team1_loss_rate.toFixed(0)}%</span>
                </div>
              </div>

              {/* Team 2 */}
              <div className="bg-[#F8F9FA] rounded-xl p-5">
                <h3 className="text-[16px] font-semibold text-[#E83E8C] mb-4 flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={getFlagUrl(data.team2, 24)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
                  {data.team2}
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Wins</span>
                    <span className="font-bold text-[#198754]">{data.team2_wins} <span className="font-normal text-[#ADB5BD] text-[12px] ml-1">{data.team2_win_rate.toFixed(0)}%</span></span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Losses</span>
                    <span className="font-bold text-[#DC3545]">{data.team2_losses} <span className="font-normal text-[#ADB5BD] text-[12px] ml-1">{data.team2_loss_rate.toFixed(0)}%</span></span>
                  </div>
                  <div className="flex justify-between text-[14px]">
                    <span className="text-[#6C757D]">Draws</span>
                    <span className="font-bold text-[#FD7E14]">{data.draws} <span className="font-normal text-[#ADB5BD] text-[12px] ml-1">{data.team2_draw_rate.toFixed(0)}%</span></span>
                  </div>
                  <div className="border-t border-[#E9ECEF] pt-3 mt-3">
                    <div className="flex justify-between text-[14px]">
                      <span className="text-[#6C757D]">Goals</span>
                      <span className="font-bold">{formatNumber(data.team2_goals)}</span>
                    </div>
                    <div className="flex justify-between text-[14px] mt-2">
                      <span className="text-[#6C757D]">Avg Goals/Match</span>
                      <span className="font-bold">{data.team2_avg_goals.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                {/* Stacked bar: wins (pink) | draws (orange) | losses (red) */}
                <div className="mt-4 h-2 bg-[#E9ECEF] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-[#E83E8C]"
                    style={{ width: `${data.team2_win_rate}%` }}
                  />
                  <div
                    className="h-full bg-[#FD7E14]"
                    style={{ width: `${data.team2_draw_rate}%` }}
                  />
                  <div
                    className="h-full bg-[#DC3545]"
                    style={{ width: `${data.team2_loss_rate}%` }}
                  />
                </div>
                <div className="flex justify-center gap-4 mt-2 text-[11px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#E83E8C] inline-block" /> W {data.team2_win_rate.toFixed(0)}%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#FD7E14] inline-block" /> D {data.team2_draw_rate.toFixed(0)}%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#DC3545] inline-block" /> L {data.team2_loss_rate.toFixed(0)}%</span>
                </div>
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
          {/* Match History */}
          {data.matches_list && data.matches_list.length > 0 && (
            <div className="card p-5 mb-6">
              <h3 className="section-title mb-4">⚽ Match History</h3>
              <div className="overflow-x-auto">
                <table className="data-table w-full">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Home</th>
                      <th className="text-center">Score</th>
                      <th>Away</th>
                      <th>Tournament</th>
                      <th>City</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.matches_list.map((m, i) => (
                      <tr key={i}>
                        <td className="text-[13px] text-[#6C757D] whitespace-nowrap">
                          {m.date?.slice(0, 10)}
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={getFlagUrl(m.home_team, 24)} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
                            <span className={m.home_team === data.team1 ? "font-semibold text-[#1A56DB]" : "font-semibold text-[#E83E8C]"}>
                              {m.home_team}
                            </span>
                          </div>
                        </td>
                        <td className="text-center font-bold text-[15px] tabular-nums whitespace-nowrap">
                          <span className={m.home_score > m.away_score ? "text-[#198754]" : m.home_score < m.away_score ? "text-[#DC3545]" : "text-[#FD7E14]"}>
                            {m.home_score}
                          </span>
                          <span className="text-[#ADB5BD] mx-1">–</span>
                          <span className={m.away_score > m.home_score ? "text-[#198754]" : m.away_score < m.home_score ? "text-[#DC3545]" : "text-[#FD7E14]"}>
                            {m.away_score}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={getFlagUrl(m.away_team, 24)} alt="" className="w-5 h-3.5 object-cover rounded-sm shrink-0" />
                            <span className={m.away_team === data.team1 ? "font-semibold text-[#1A56DB]" : "font-semibold text-[#E83E8C]"}>
                              {m.away_team}
                            </span>
                          </div>
                        </td>
                        <td className="text-[13px] text-[#6C757D]">{m.tournament || "—"}</td>
                        <td className="text-[13px] text-[#6C757D]">
                          {m.city || "—"}{m.country ? `, ${m.country}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
