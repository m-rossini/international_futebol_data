'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { TeamTable } from '@/components/shared/TeamTable';
import { logApiCall, logUserAction } from '@/lib/observability';
import type { TeamItem } from '@/lib/types';
import type { SortDir } from '@/components/shared/DataTable';

const API = '/api/proxy';

interface Props {
  tournamentName?: string;
}

function buildQs(sp: URLSearchParams, tournamentName?: string): string {
  const q = new URLSearchParams();
  if (tournamentName) {
    q.set('tournaments', tournamentName);
  }
  for (const key of ['teams', 'tournaments', 'countries', 'date_from', 'date_to']) {
    const v = sp.get(key);
    if (v && !q.has(key)) q.set(key, v);
  }
  return q.toString();
}

export function TeamStandingsTable({ tournamentName }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => buildQs(sp, tournamentName), [sp, tournamentName]);

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

    async function loadTeams() {
      setLoading(true);
      setError(null);
      const t0 = performance.now();
      try {
        const url = `${API}/teams${qs ? '?' + qs : ''}`;
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
          setLoading(false);
        }
      } catch (err) {
        const duration = performance.now() - t0;
        logApiCall('/teams', duration, 0, {
          tournament: tournamentName,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load teams');
          setLoading(false);
        }
      }
    }

    loadTeams();
    return () => {
      cancelled = true;
    };
  }, [qs, tournamentName]);

  const setMinMatches = useCallback(
    (value: number) => {
      logUserAction('set_min_matches', { page: 'team_standings', min_matches: value });
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

  const handleSortChange = useCallback(
    (key: string | null, dir: SortDir) => {
      logUserAction('sort_teams', { page: 'team_standings', sort_key: key, sort_dir: dir });
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

  const handleRowClick = useCallback(
    (row: TeamItem) => {
      logUserAction('select_team', { page: 'team_standings', team: row.team });
      const params = new URLSearchParams(sp.toString());
      if (tournamentName && !params.has('tournaments')) {
        params.set('tournaments', tournamentName);
      }
      for (const key of ['sort', 'dir', 'min_matches']) {
        params.delete(key);
      }
      const q = params.toString();
      router.push(`/teams/${encodeURIComponent(row.team)}${q ? `?${q}` : ''}`);
    },
    [router, sp, tournamentName],
  );

  return (
    <TeamTable
      data={teams}
      loading={loading}
      error={error}
      sortKey={sortKey}
      sortDir={sortDir}
      onSortChange={handleSortChange}
      onRowClick={handleRowClick}
      minMatches={minMatches}
      onMinMatchesChange={setMinMatches}
    />
  );
}
