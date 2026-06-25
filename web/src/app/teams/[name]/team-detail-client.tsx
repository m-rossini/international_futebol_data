"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { YearlyChart } from "@/components/shared/YearlyChart";
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

function winRateColor(rate: number): string {
  if (rate >= 60) return "text-green-600 font-semibold";
  if (rate >= 45) return "text-amber-600 font-semibold";
  return "text-red-500 font-semibold";
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

function StatCard({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-500">{label}</span>
      <span className="text-xl font-bold text-gray-800">{value}</span>
    </div>
  );
}

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
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 mb-6">
            <StatCard label="Matches" value={detail.matches_played.toLocaleString()} />
            <StatCard label="Wins" value={detail.wins.toLocaleString()} />
            <StatCard label="Losses" value={detail.losses.toLocaleString()} />
            <StatCard label="Draws" value={detail.draws.toLocaleString()} />
            <StatCard
              label="Win Rate"
              value={
                <span className={winRateColor(detail.win_rate)}>
                  {detail.win_rate.toFixed(1)}%
                </span>
              }
            />
          </div>

          {/* Goal stats */}
          {detail.goals_for_stats && detail.goals_against_stats && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Goal Statistics</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Goals For (avg)" value={detail.goals_for_stats.mean?.toFixed(2) ?? "—"} />
                <StatCard label="Goals Against (avg)" value={detail.goals_against_stats.mean?.toFixed(2) ?? "—"} />
                <StatCard label="Total Goals" value={(detail.goals_for_stats.sum + detail.goals_against_stats.sum).toLocaleString()} />
                <StatCard
                  label="Avg Goal Diff"
                  value={detail.goal_diff_stats?.mean?.toFixed(2) ?? "—"}
                />
              </div>
            </div>
          )}

          {/* Yearly chart */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Matches per Year</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <YearlyChart
                data={detail.yearly.map((r) => ({
                  year: r.year,
                  wins: r.wins,
                  losses: r.losses,
                  draws: r.draws,
                }))}
              />
            </div>
          </div>

          {/* Yearly breakdown */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Yearly Breakdown</h2>
            {detail.yearly.length > 0 ? (
              <DataTable
                columns={yearlyColumns}
                data={detail.yearly}
                keyField="year"
                defaultSort={{ key: "year", dir: "desc" }}
                onRowClick={handleYearClick}
              />
            ) : (
              <p className="text-sm text-gray-400">No yearly data available</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
