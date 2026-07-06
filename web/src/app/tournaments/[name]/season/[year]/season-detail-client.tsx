'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trophy } from 'lucide-react';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { FilterBar } from '@/components/shared/FilterBar';
import { CountryFlag } from '@/components/shared/CountryFlag';
import { MatchTable } from '@/components/shared/MatchTable';
import { logApiCall, logUserAction } from '@/lib/observability';
import type { TournamentSeasonDetail } from '@/lib/types';

const API = '/api/proxy';

function buildQs(params: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of ['countries']) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

const standingsColumns: Column<TournamentSeasonDetail['standings'][number]>[] = [
  {
    key: 'team',
    header: 'Team',
    render: (r) => (
      <span className="inline-flex items-center gap-1.5">
        <CountryFlag countryName={r.team} size={16} />
        {r.team}
      </span>
    ),
  },
  { key: 'matches_played', header: 'P', sortable: true },
  { key: 'wins', header: 'W', sortable: true },
  { key: 'draws', header: 'D', sortable: true },
  { key: 'losses', header: 'L', sortable: true },
  { key: 'goals_for', header: 'GF', sortable: true },
  { key: 'goals_against', header: 'GA', sortable: true },
  {
    key: 'goal_diff',
    header: 'GD',
    sortable: true,
    render: (r) => (
      <span className={r.goal_diff > 0 ? 'text-green-600' : r.goal_diff < 0 ? 'text-red-500' : ''}>
        {r.goal_diff > 0 ? '+' : ''}
        {r.goal_diff}
      </span>
    ),
  },
  {
    key: 'points',
    header: 'Pts',
    sortable: true,
    render: (r) => <span className="font-bold text-gray-900">{r.points}</span>,
  },
];

interface Props {
  tournamentName: string;
  year: number;
}

export function SeasonDetailClient({ tournamentName, year }: Props) {
  const sp = useSearchParams();
  const router = useRouter();

  const [detail, setDetail] = useState<TournamentSeasonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => buildQs(sp), [sp]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const url = `${API}/tournament/${encodeURIComponent(tournamentName)}/season/${year}${qs ? '?' + qs : ''}`;
        const res = await fetch(url);
        const duration = performance.now() - t0;
        logApiCall('/tournament/:name/season/:year', duration, res.status, {
          tournament: tournamentName,
          year,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TournamentSeasonDetail = await res.json();
        if (!cancelled) {
          if (data.error) {
            setError(data.message || 'Season not found');
          } else {
            setDetail(data);
          }
          setLoading(false);
        }
      } catch (err) {
        const duration = performance.now() - t0;
        logApiCall('/tournament/:name/season/:year', duration, 0, {
          tournament: tournamentName,
          year,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load season data');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [tournamentName, year, qs]);

  const handleBack = useCallback(() => {
    logUserAction('back_to_tournament', { tournament: tournamentName });
    const params = new URLSearchParams(sp.toString());
    const q = params.toString();
    router.push(`/tournaments/${encodeURIComponent(tournamentName)}${q ? `?${q}` : ''}`);
  }, [router, sp, tournamentName]);

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to {tournamentName}
        </button>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 mb-2 inline-flex items-center gap-2">
        <Trophy size={22} className="text-amber-500" />
        {tournamentName} {year}
      </h1>
      {detail?.host_country && (
        <p className="text-sm text-gray-500 mb-4 inline-flex items-center gap-1.5">
          {'Hosted in '}
          {detail.host_country.split(', ').map((c, i) => (
            <span key={c} className="inline-flex items-center gap-0.5">
              {i > 0 && <span className="text-gray-400">, </span>}
              <CountryFlag countryName={c} size={14} />
              {c}
            </span>
          ))}
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
              <StatCard label="Teams" value={detail.summary.unique_teams.toLocaleString()} />
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
              </div>
            </div>
          )}

          {/* Standings */}
          {detail.standings.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Standings</h2>
              <DataTable
                columns={standingsColumns}
                data={detail.standings}
                keyField="team"
                defaultSort={{ key: 'points', dir: 'desc' }}
              />
            </div>
          )}

          {/* Match list */}
          {detail.matches_list.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Matches</h2>
              <MatchTable matches={detail.matches_list} showNeutral />
            </div>
          )}
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
