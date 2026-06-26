"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { YearlyChart } from "@/components/shared/YearlyChart";
import { CumulativeGoalsChart } from "@/components/shared/CumulativeGoalsChart";
import { GoalsTrendChart } from "@/components/shared/charts/GoalsTrendChart";
import {
  StatsBar,
  buildMatchStats,
  buildGoalStats,
} from "@/components/shared/StatsBar";
import type { TeamDetail, YearlyRow } from "@/lib/types";

const API = "/api/proxy";

function buildQs(params: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of ["tournaments", "countries", "date_from", "date_to"]) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

const yearlyColumns: Column<YearlyRow>[] = [
  { key: "year", header: "Year", sortable: true },
  {
    key: "matches_played",
    header: "Matches",
    sortable: true,
    render: (r) => r.matches_played.toLocaleString(),
  },
  {
    key: "wins",
    header: "Wins",
    sortable: true,
    render: (r) => r.wins.toLocaleString(),
  },
  {
    key: "losses",
    header: "Losses",
    sortable: true,
    render: (r) => r.losses.toLocaleString(),
  },
  {
    key: "draws",
    header: "Draws",
    sortable: true,
    render: (r) => r.draws.toLocaleString(),
  },
  {
    key: "goals_for",
    header: "GF",
    sortable: true,
    render: (r) => r.goals_for.toLocaleString(),
  },
  {
    key: "goals_against",
    header: "GA",
    sortable: true,
    render: (r) => r.goals_against.toLocaleString(),
  },
];

interface Props {
  teamName: string;
}

export function TeamDetailClient({ teamName }: Props) {
  const sp = useSearchParams();
  const router = useRouter();

  const [detail, setDetail] = useState<TeamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => buildQs(sp), [sp]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const url = `${API}/team/${encodeURIComponent(teamName)}${qs ? "?" + qs : ""}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TeamDetail = await res.json();
        if (!cancelled) {
          if (data.error) {
            setError(data.message || "Team not found");
          } else {
            setDetail(data);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load team data");
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [teamName, qs]);

  const handleBack = useCallback(() => {
    const params = new URLSearchParams(sp.toString());
    const q = params.toString();
    router.push(`/teams${q ? `?${q}` : ""}`);
  }, [router, sp]);

  const handleYearClick = useCallback(
    (row: YearlyRow) => {
      const params = new URLSearchParams(sp.toString());
      const q = params.toString();
      router.push(
        `/teams/${encodeURIComponent(teamName)}/${row.year}${q ? `?${q}` : ""}`,
      );
    },
    [router, sp, teamName],
  );

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to teams
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-4">{teamName}</h1>

      <FilterBar fields={{ teams: false }} />

      {loading ? (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500 mt-4">Error: {error}</p>
      ) : detail ? (
        <>
          {/* Match stats */}
          <div className="mt-4 mb-6">
            <StatsBar
              items={buildMatchStats(
                detail.matches_played,
                detail.wins,
                detail.losses,
                detail.draws,
                detail.win_rate,
              )}
            />
          </div>

          {/* Goal stats */}
          {detail.goals_for_stats && detail.goals_against_stats && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Goal Statistics
              </h2>
              <StatsBar
                items={buildGoalStats(
                  detail.goals_for_stats.sum,
                  detail.goals_against_stats.sum,
                  detail.goals_for_stats.mean ?? undefined,
                  detail.goals_against_stats.mean ?? undefined,
                  detail.goal_diff_stats?.mean ?? undefined,
                )}
              />
            </div>
          )}

          {/* Yearly chart + Cumulative goals side-by-side */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Charts
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Yearly W/L/D chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Matches per Year
                </h3>
                <YearlyChart
                  data={detail.yearly.map((r) => ({
                    year: r.year,
                    wins: r.wins,
                    losses: r.losses,
                    draws: r.draws,
                  }))}
                />
              </div>

              {/* Cumulative goals trend */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Cumulative Goals
                </h3>
                <CumulativeGoalsChart
                  matches={detail.matches_list}
                  track={[
                    { team: teamName, color: "#22c55e", label: "Goals For" },
                    { team: teamName, color: "#ef4444", label: "Goals Against", against: true },
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Goals trend (rolling average) */}
          {detail.matches_list.length >= 5 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Goals Trend
              </h2>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <GoalsTrendChart
                  matches={detail.matches_list}
                  windowSize={5}
                  height={160}
                />
              </div>
            </div>
          )}

          {/* Yearly breakdown */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">
              Yearly Breakdown
            </h2>
            {detail.yearly.length > 0 ? (
              <DataTable
                columns={yearlyColumns}
                data={detail.yearly}
                keyField="year"
                defaultSort={{ key: "year", dir: "desc" }}
                onRowClick={handleYearClick}
              />
            ) : (
              <p className="text-sm text-gray-400">
                No yearly data available
              </p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
