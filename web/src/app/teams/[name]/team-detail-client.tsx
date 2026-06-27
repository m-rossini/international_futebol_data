"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { FilterBar } from "@/components/shared/FilterBar";
import { CountryFlag } from "@/components/shared/CountryFlag";
import { YearlyChart } from "@/components/shared/chart/YearlyChart";
import { CumulativeGoalsChart } from "@/components/shared/chart/CumulativeGoalsChart";
import { MatchLadderChart } from "@/components/shared/chart/MatchLadderChart";
import { BiggestWinsCard } from "@/components/shared/BiggestWinsCard";
import {
  StatsBar,
  buildMatchStats,
  buildGoalStats,
} from "@/components/shared/StatsBar";
import { logApiCall, logUserAction } from "@/lib/observability";
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
    key: "points",
    header: "Pts",
    sortable: true,
    render: (r) => (
      <span className="font-bold text-gray-900">
        {(r.wins * 3 + r.draws).toLocaleString()}
      </span>
    ),
  },
  {
    key: "win_rate",
    header: "Win Rate",
    sortable: true,
    render: (r) => {
      const rate = r.matches_played > 0 ? (r.wins / r.matches_played) * 100 : 0;
      return <span className={winRateColor(rate)}>{rate.toFixed(1)}%</span>;
    },
    compare: (a, b) => {
      const ra = a.matches_played > 0 ? (a.wins / a.matches_played) * 100 : 0;
      const rb = b.matches_played > 0 ? (b.wins / b.matches_played) * 100 : 0;
      return ra - rb;
    },
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
  {
    key: "gf_ga_ratio",
    header: "GF/GA",
    sortable: true,
    render: (r) =>
      r.goals_against > 0
        ? (r.goals_for / r.goals_against).toFixed(2)
        : "—",
    compare: (a, b) => {
      const ra = a.goals_against > 0 ? a.goals_for / a.goals_against : 0;
      const rb = b.goals_against > 0 ? b.goals_for / b.goals_against : 0;
      return ra - rb;
    },
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
      const t0 = performance.now();
      try {
        const url = `${API}/team/${encodeURIComponent(teamName)}${qs ? "?" + qs : ""}`;
        const res = await fetch(url);
        const duration = performance.now() - t0;
        logApiCall("/team/:name", duration, res.status, { team: teamName, query: qs || undefined });
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
        const duration = performance.now() - t0;
        logApiCall("/team/:name", duration, 0, { team: teamName, error: err instanceof Error ? err.message : String(err) });
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
    logUserAction("back_to_teams", { from_team: teamName });
    const params = new URLSearchParams(sp.toString());
    const q = params.toString();
    router.push(`/teams${q ? `?${q}` : ""}`);
  }, [router, sp, teamName]);

  const handleYearClick = useCallback(
    (row: YearlyRow) => {
      logUserAction("select_year", { team: teamName, year: row.year });
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

      <h1 className="text-2xl font-bold text-gray-800 mb-4 inline-flex items-center gap-2">
        <CountryFlag countryName={teamName} size={22} />
        {teamName}
      </h1>

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
                detail.points,
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

          {/* Yearly chart + Cumulative goals */}
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

          {/* W/D/L ladder (match-by-match) */}
          {detail.matches_list.length >= 2 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                W/D/L Ladder
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <MatchLadderChart
                    matches={detail.matches_list}
                    team={teamName}
                    height={200}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Biggest wins & worst defeats */}
          {(detail.biggest_wins.length > 0 || detail.worst_defeats.length > 0) && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Biggest Wins &amp; Worst Defeats
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <BiggestWinsCard
                  team={teamName}
                  wins={detail.biggest_wins}
                  label="Biggest wins"
                />
                <BiggestWinsCard
                  team={teamName}
                  wins={detail.worst_defeats}
                  label="Worst defeats"
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
