'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { FilterBar } from '@/components/shared/FilterBar';
import { logApiCall, logUserAction } from '@/lib/observability';
import type { TournamentListItem } from '@/lib/types';

const API = '/api/proxy';

function buildQs(params: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of ['tournaments', 'countries', 'date_from', 'date_to']) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

const columns: Column<TournamentListItem>[] = [
  {
    key: 'tournament',
    header: 'Tournament',
    sortable: true,
  },
  {
    key: 'first_year',
    header: 'First Season',
    sortable: true,
  },
  {
    key: 'last_year',
    header: 'Last Season',
    sortable: true,
  },
  {
    key: 'editions',
    header: 'Editions',
    sortable: true,
  },
  {
    key: 'matches',
    header: 'Total Matches',
    sortable: true,
    render: (row) => row.matches.toLocaleString(),
  },
  {
    key: 'total_goals',
    header: 'Total Goals',
    sortable: true,
    render: (row) => row.total_goals.toLocaleString(),
  },
  {
    key: 'avg_goals',
    header: 'Goals/Match',
    sortable: true,
    render: (row) => row.avg_goals.toFixed(2),
  },
];

export function TournamentsClient() {
  const sp = useSearchParams();
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => buildQs(sp), [sp]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const url = `${API}/tournaments${qs ? '?' + qs : ''}`;
        const res = await fetch(url);
        const duration = performance.now() - t0;
        logApiCall('/tournaments', duration, res.status, { query: qs || undefined });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: TournamentListItem[] = await res.json();
        if (!cancelled) {
          setTournaments(data);
          setLoading(false);
        }
      } catch (err) {
        const duration = performance.now() - t0;
        logApiCall('/tournaments', duration, 0, {
          query: qs || undefined,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load tournaments');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [qs]);

  const handleRowClick = useCallback((row: TournamentListItem) => {
    logUserAction('select_tournament', { page: 'tournaments', tournament: row.tournament });
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Tournaments</h1>
      <FilterBar fields={{ teams: false }} />
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Error: {error}</p>
      ) : (
        <DataTable
          columns={columns}
          data={tournaments}
          keyField="tournament"
          defaultSort={{ key: 'matches', dir: 'desc' }}
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
