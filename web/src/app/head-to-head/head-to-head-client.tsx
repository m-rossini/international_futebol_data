"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import { FilterBar } from "@/components/shared/FilterBar";
import { AutocompleteInput } from "@/components/shared/AutocompleteInput";
import { StatsBar, buildH2HStats } from "@/components/shared/StatsBar";
import { MatchTable } from "@/components/shared/MatchTable";
import { CumulativeWinsChart } from "@/components/shared/CumulativeWinsChart";
import { CumulativeGoalsChart } from "@/components/shared/CumulativeGoalsChart";
import type { HeadToHeadResult } from "@/lib/types";

const API = "/api/proxy";

let cachedTeams: string[] | null = null;
async function fetchTeams(): Promise<string[]> {
  if (cachedTeams) return cachedTeams;
  const res = await fetch(`${API}/filters`);
  const data = await res.json();
  cachedTeams = data.teams || [];
  return cachedTeams;
}

function buildQs(params: URLSearchParams, team1: string, team2: string): string {
  const q = new URLSearchParams();
  q.set("team1", team1);
  q.set("team2", team2);
  for (const key of ["tournaments", "countries", "date_from", "date_to"]) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

export function HeadToHeadClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [team1, setTeam1] = useState(sp.get("team1") || "");
  const [team2, setTeam2] = useState(sp.get("team2") || "");
  const [result, setResult] = useState<HeadToHeadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load team names once
  useEffect(() => {
    fetchTeams().then(setTeamNames).catch(() => {});
  }, []);

  // Persist team selection to URL
  const updateTeamParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp]
  );

  const handleTeam1 = useCallback(
    (sel: string[]) => {
      const val = sel[0] || "";
      setTeam1(val);
      updateTeamParam("team1", val);
    },
    [updateTeamParam]
  );

  const handleTeam2 = useCallback(
    (sel: string[]) => {
      const val = sel[0] || "";
      setTeam2(val);
      updateTeamParam("team2", val);
    },
    [updateTeamParam]
  );

  const swapTeams = useCallback(() => {
    const t1 = team2;
    const t2 = team1;
    setTeam1(t1);
    setTeam2(t2);
    const params = new URLSearchParams(sp.toString());
    params.set("team1", t1);
    params.set("team2", t2);
    router.replace(`${pathname}?${params.toString()}`);
  }, [team1, team2, router, pathname, sp]);

  // Fetch head-to-head when both teams selected + filters change
  const qs = useMemo(() => buildQs(sp, team1, team2), [sp, team1, team2]);

  useEffect(() => {
    if (!team1 || !team2) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const url = `${API}/head_to_head?${qs}`;
        const res = await fetch(url);
        const data: HeadToHeadResult = await res.json();
        if (!cancelled) {
          if (data.error) {
            setError(data.message || "An error occurred");
            setResult(null);
          } else {
            setResult(data);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
      setError(null);
    };
  }, [qs, team1, team2]);

  // Extract dynamic keys from the API response
  const team1Wins = result ? ((result[`${result.team1}_wins`] as number) ?? 0) : 0;
  const team2Wins = result ? ((result[`${result.team2}_wins`] as number) ?? 0) : 0;
  const team1Goals = result ? ((result[`${result.team1}_goals`] as number) ?? 0) : 0;
  const team2Goals = result ? ((result[`${result.team2}_goals`] as number) ?? 0) : 0;
  const avgGoalsPerMatch = result?.total_goals_per_match_stats?.mean ?? undefined;

  const sameTeam = team1 && team2 && team1 === team2;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Head to Head</h1>

      {/* Team selectors */}
      <div className="flex items-end gap-2 mb-4">
        <div className="flex flex-col gap-1 min-w-[200px] max-w-[300px] flex-1">
          <label className="text-xs font-medium text-gray-500">Team 1</label>
          <AutocompleteInput
            options={teamNames}
            selected={team1 ? [team1] : []}
            onChange={handleTeam1}
            multi={false}
            placeholder="Select team..."
          />
        </div>

        <button
          type="button"
          onClick={swapTeams}
          disabled={!team1 || !team2}
          className="mb-0.5 p-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title="Swap teams"
        >
          <ArrowRightLeft size={16} className="text-gray-500" />
        </button>

        <div className="flex flex-col gap-1 min-w-[200px] max-w-[300px] flex-1">
          <label className="text-xs font-medium text-gray-500">Team 2</label>
          <AutocompleteInput
            options={teamNames}
            selected={team2 ? [team2] : []}
            onChange={handleTeam2}
            multi={false}
            placeholder="Select team..."
          />
        </div>
      </div>

      <FilterBar fields={{ teams: false }} />

      {/* Content area */}
      {sameTeam ? (
        <p className="text-sm text-amber-600 mt-4">Select two different teams to compare.</p>
      ) : !team1 || !team2 ? (
        <p className="text-sm text-gray-400 mt-4">Select two teams to compare their head-to-head record.</p>
      ) : loading ? (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      ) : error ? (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      ) : result ? (
        <>
          {/* Summary cards */}
          <div className="mb-6 mt-2">
            <StatsBar
              items={buildH2HStats(
                result.team1,
                team1Wins,
                result.draws,
                team1Goals,
                result.team2,
                team2Wins,
                team2Goals,
                result.matches,
                avgGoalsPerMatch,
              )}
            />
          </div>

          {/* Cumulative charts: wins + goals side-by-side */}
          {result.matches > 0 && (
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Cumulative wins */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Cumulative Wins
                </h3>
                <CumulativeWinsChart
                  matches={result.matches_list}
                  team1={result.team1}
                  team2={result.team2}
                />
              </div>

              {/* Cumulative goals */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Cumulative Goals
                </h3>
                <CumulativeGoalsChart
                  matches={result.matches_list}
                  track={[
                    { team: result.team1, color: "#3b82f6", label: result.team1 },
                    { team: result.team2, color: "#ef4444", label: result.team2 },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Match history */}
          {result.matches > 0 ? (
            <MatchTable
              matches={result.matches_list}
              heading={`Match History (${result.matches} matches)`}
              showNeutral
            />
          ) : (
            <p className="text-sm text-gray-400 mt-4">
              No matches found between {result.team1} and {result.team2} with the current filters.
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      )}
    </div>
  );
}

