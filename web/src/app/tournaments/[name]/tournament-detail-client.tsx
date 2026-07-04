'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, Trophy } from 'lucide-react';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { FilterBar } from '@/components/shared/FilterBar';
import { CountryFlag } from '@/components/shared/CountryFlag';
import { GoalsPerYearChart } from '@/components/shared/chart/GoalsPerYearChart';
import { logApiCall, logUserAction } from '@/lib/observability';
import { TEAMS_COLUMNS } from '@/lib/team-columns';
import type { TournamentDetail, TournamentYearlyRow, TeamItem } from '@/lib/types';

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
    header: 'Host(s)',
    sortable: true,
    render: (r) => {
      if (!r.host_country) return '—';
      const countries = r.host_country.split(', ');
      return (
        <span className="inline-flex items-center gap-1 flex-wrap">
          {countries.map((c, i) => (
            <span key={c} className="inline-flex items-center gap-0.5">
              {i > 0 && <span className="text-gray-400">,</span>}
              <CountryFlag countryName={c} size={14} />
              {c}
            </span>
          ))}
        </span>
      );
    },
  },
];

interface Props {
  tournamentName: string;
}

export function TournamentDetailClient({ tournamentName }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [detail, setDetail] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  const qs = useMemo(() => buildQs(sp), [sp]);

  const minMatches = useMemo(() => {
    const v = sp.get('min_matches');
    return v ? Math.max(0, parseInt(v, 10) || 0) : 0;
  }, [sp]);

  const sortKey = useMemo(() => sp.get('sort') || null, [sp]);
  const sortDir = useMemo(() => {
    const d = sp.get('dir');
    return d === 'asc' || d === 'desc' ? d : null;
  }, [sp]);

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

  useEffect(() => {
    let cancelled = false;

    async function loadTeams() {
      setTeamsLoading(true);
      const t0 = performance.now();
      try {
        const url = `${API}/teams?tournaments=${encodeURIComponent(tournamentName)}`;
        const res = await fetch(url);
        const duration = performance.now() - t0;
        logApiCall('/teams', duration, res.status, {
          tournament: tournamentName,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TeamItem[] = (await res.json()).map((t: TeamItem) => ({
          ...t,
          gf_ga_ratio: t.goals_against > 0 ? t.goals_for / t.goals_against : 0,
        }));
        if (!cancelled) {
          setTeams(data);
          setTeamsLoading(false);
        }
      } catch (err) {
        const duration = performance.now() - t0;
        logApiCall('/teams', duration, 0, {
          tournament: tournamentName,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setTeamsLoading(false);
        }
      }
    }

    loadTeams();
    return () => {
      cancelled = true;
    };
  }, [tournamentName]);

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

  const setMinMatches = useCallback(
    (value: number) => {
      logUserAction('set_min_matches', { page: 'tournament_detail', min_matches: value });
      const params = new URLSearchParams(sp.toString());
      if (value > 0) {
        params.set('min_matches', String(value));
      } else {
        params.delete('min_matches');
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp],
  );

  const handleTeamsSortChange = useCallback(
    (key: string | null, dir: 'asc' | 'desc' | null) => {
      logUserAction('sort_teams', { page: 'tournament_detail', sort_key: key, sort_dir: dir });
      const params = new URLSearchParams(sp.toString());
      if (key && dir) {
        params.set('sort', key);
        params.set('dir', dir);
      } else {
        params.delete('sort');
        params.delete('dir');
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp],
  );

  const handleTeamRowClick = useCallback(
    (row: TeamItem) => {
      logUserAction('select_team', { page: 'tournament_detail', team: row.team });
      router.push(`/teams/${encodeURIComponent(row.team)}`);
    },
    [router],
  );

  const filteredTeams = useMemo(() => {
    if (minMatches <= 0) return teams;
    return teams.filter((t) => t.matches_played >= minMatches);
  }, [teams, minMatches]);

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

      <FilterBar fields={{ teams: false, tournaments: false }} injectDefaults={false}>
        <div className="flex flex-col gap-1 w-[140px]">
          <label className="text-xs font-medium text-gray-500">Min. matches</label>
          <input
            type="number"
            min={0}
            value={minMatches || ''}
            onChange={(e) => setMinMatches(Number(e.target.value))}
            placeholder="0"
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
          />
        </div>
      </FilterBar>

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

          {/* Team standings */}
          {teams.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Team Standings ({filteredTeams.length})
              </h2>
              {teamsLoading ? (
                <p className="text-sm text-gray-400">Loading teams...</p>
              ) : (
                <DataTable
                  columns={TEAMS_COLUMNS}
                  data={filteredTeams}
                  keyField="team"
                  defaultSort={{ key: 'matches_played', dir: 'desc' }}
                  sortKey={sortKey}
                  sortDir={sortDir}
                  onSortChange={handleTeamsSortChange}
                  onRowClick={handleTeamRowClick}
                />
              )}
            </div>
          )}

          {/* Host countries summary */}
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
