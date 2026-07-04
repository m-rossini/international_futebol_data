'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trophy } from 'lucide-react';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { FilterBar } from '@/components/shared/FilterBar';
import { CountryFlag } from '@/components/shared/CountryFlag';
import { GoalsPerYearChart } from '@/components/shared/chart/GoalsPerYearChart';
import { logApiCall, logUserAction } from '@/lib/observability';
import type { TournamentDetail, TournamentYearlyRow } from '@/lib/types';

const API = '/api/proxy';

function buildQs(params: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of ['countries', 'date_from', 'date_to']) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

const yearlyColumns: Column<TournamentYearlyRow>[] = [
  { key: 'year', header: 'Year', sortable: true },
  {
    key: 'matches',
    header: 'Matches',
    sortable: true,
    render: (r) => r.matches.toLocaleString(),
  },
  {
    key: 'goals',
    header: 'Goals',
    sortable: true,
    render: (r) => r.goals.toLocaleString(),
  },
  {
    key: 'avg_goals',
    header: 'Avg Goals',
    sortable: true,
    render: (r) => r.avg_goals.toFixed(2),
  },
  {
    key: 'home_wins',
    header: 'Home',
    sortable: true,
  },
  {
    key: 'away_wins',
    header: 'Away',
    sortable: true,
  },
  {
    key: 'draws',
    header: 'Draws',
    sortable: true,
  },
  {
    key: 'teams',
    header: 'Teams',
    sortable: true,
  },
  {
    key: 'host_country',
    header: 'Host',
    sortable: true,
    render: (r) =>
      r.host_country ? (
        <span className="inline-flex items-center gap-1">
          <CountryFlag countryName={r.host_country} size={14} />
          {r.host_country}
        </span>
      ) : (
        '—'
      ),
  },
];

interface Props {
  tournamentName: string;
}

export function TournamentDetailClient({ tournamentName }: Props) {
  const sp = useSearchParams();
  const router = useRouter();

  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => buildQs(sp), [sp]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const url = `${API}/tournament/${encodeURIComponent(tournamentName)}${qs ? '?' + qs : ''}`;
        const res = await fetch(url);
        const duration = performance.now() - t0;
        logApiCall('/tournament/:name', duration, res.status, {
          tournament: tournamentName,
          query: qs || undefined,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TournamentDetail = await res.json();
        if (!cancelled) {
          if (data.error) {
            setError(data.message || 'Tournament not found');
          } else {
            setDetail(data);
          }
          setLoading(false);
        }
      } catch (err) {
        const duration = performance.now() - t0;
        logApiCall('/tournament/:name', duration, 0, {
          tournament: tournamentName,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tournament data');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tournamentName, qs]);

  const handleBack = useCallback(() => {
    logUserAction('back_to_tournaments', { from_tournament: tournamentName });
    const params = new URLSearchParams(sp.toString());
    const q = params.toString();
    router.push(`/tournaments${q ? `?${q}` : ''}`);
  }, [router, sp, tournamentName]);

  const handleYearClick = useCallback(
    (row: TournamentYearlyRow) => {
      logUserAction('select_season', { tournament: tournamentName, year: row.year });
      const params = new URLSearchParams(sp.toString());
      const q = params.toString();
      router.push(
        `/tournaments/${encodeURIComponent(tournamentName)}/season/${row.year}${q ? `?${q}` : ''}`,
      );
    },
    [router, sp, tournamentName],
  );

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to tournaments
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-2 inline-flex items-center gap-2">
        <Trophy size={22} className="text-amber-500" />
        {tournamentName}
      </h1>
      {detail?.summary && (
        <p className="text-sm text-gray-500 mb-4">
          {detail.summary.first_year}–{detail.summary.last_year} · {detail.summary.editions}{' '}
          editions · {detail.summary.unique_teams} teams
        </p>
      )}

      <FilterBar fields={{ teams: false, tournaments: false }} injectDefaults={false} />

      {loading ? (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500 mt-4">Error: {error}</p>
      ) : detail ? (
        <>
          {/* Summary stats */}
          <div className="mt-4 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">All-Time Summary</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <StatCard label="Matches" value={detail.summary.matches.toLocaleString()} />
              <StatCard label="Goals" value={detail.summary.total_goals.toLocaleString()} />
              <StatCard
                label="Avg Goals/Match"
                value={detail.summary.avg_goals_per_match.toFixed(2)}
              />
              <StatCard
                label="Home Wins"
                value={detail.summary.home_wins.toLocaleString()}
                color="text-green-600"
              />
              <StatCard
                label="Away Wins"
                value={detail.summary.away_wins.toLocaleString()}
                color="text-red-500"
              />
              <StatCard
                label="Draws"
                value={detail.summary.draws.toLocaleString()}
                color="text-gray-500"
              />
            </div>
          </div>

          {/* Biggest win */}
          {detail.summary.biggest_win && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Biggest Win</h2>
              <div className="bg-white rounded-lg border border-gray-200 p-4 inline-block">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">{detail.summary.biggest_win.home_team}</span>{' '}
                  {detail.summary.biggest_win.home_score}–{detail.summary.biggest_win.away_score}{' '}
                  <span className="font-semibold">{detail.summary.biggest_win.away_team}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {detail.summary.biggest_win.date}
                  {detail.summary.biggest_win.tournament &&
                    ` · ${detail.summary.biggest_win.tournament}`}
                </p>
              </div>
            </div>
          )}

          {/* Goals per year chart */}
          {detail.yearly.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Goals by Season</h2>
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <GoalsPerYearChart
                  data={detail.yearly.map((r) => ({
                    year: r.year,
                    goals: r.goals,
                    avg_goals: r.avg_goals,
                  }))}
                />
              </div>
            </div>
          )}

          {/* Top teams */}
          {detail.summary.top_teams_by_wins.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Top Teams by Wins</h2>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2 font-medium text-gray-600">#</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Team</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.summary.top_teams_by_wins.map((t, i) => (
                      <tr key={t.team} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                        <td className="px-4 py-2 font-medium text-gray-800">
                          <span className="inline-flex items-center gap-1.5">
                            <CountryFlag countryName={t.team} size={16} />
                            {t.team}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-800">
                          {t.value}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Host countries */}
          {detail.summary.top_host_countries.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Host Countries</h2>
              <div className="flex flex-wrap gap-2">
                {detail.summary.top_host_countries.map((h) => (
                  <span
                    key={h.country}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg border border-gray-200 text-sm"
                  >
                    <CountryFlag countryName={h.country} size={16} />
                    {h.country}
                    <span className="text-gray-400">({h.matches})</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Seasons (yearly breakdown) */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Seasons</h2>
            {detail.yearly.length > 0 ? (
              <DataTable
                columns={yearlyColumns}
                data={detail.yearly}
                keyField="year"
                defaultSort={{ key: 'year', dir: 'desc' }}
                onRowClick={handleYearClick}
              />
            ) : (
              <p className="text-sm text-gray-400">No season data available</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-lg font-bold ${color ?? 'text-gray-800'}`}>{value}</p>
    </div>
  );
}
