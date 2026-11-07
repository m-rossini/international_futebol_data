'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { logApiCall } from '@/lib/observability';
import type { SquadMatchItem } from '@/lib/types';

const API = '/api/proxy';

export function SquadsClient() {
  const [matches, setMatches] = useState<SquadMatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const res = await fetch(`${API}/squads`);
        const duration = performance.now() - t0;
        logApiCall('/squads', duration, res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: SquadMatchItem[] = await res.json();
        if (!cancelled) {
          setMatches(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load squads');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: Column<SquadMatchItem>[] = [
    {
      key: 'match_date',
      header: 'Date',
      sortable: true,
    },
    {
      key: 'home_team',
      header: 'Home',
      sortable: true,
      render: (r) => (
        <Link
          href={`/squads/${encodeURIComponent(r.match_date)}/${encodeURIComponent(r.home_team)}/${encodeURIComponent(r.away_team)}`}
          className="text-blue-600 hover:underline"
        >
          {r.home_team}
        </Link>
      ),
    },
    {
      key: 'away_team',
      header: 'Away',
      sortable: true,
      render: (r) => (
        <Link
          href={`/squads/${encodeURIComponent(r.match_date)}/${encodeURIComponent(r.home_team)}/${encodeURIComponent(r.away_team)}`}
          className="text-blue-600 hover:underline"
        >
          {r.away_team}
        </Link>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Squads</h1>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500 mt-4">Error: {error}</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {matches.length.toLocaleString()} matches with squad data
          </p>
          <DataTable
            columns={columns}
            data={matches}
            keyField="match_date"
            defaultSort={{ key: 'match_date', dir: 'desc' }}
          />
        </>
      )}
    </div>
  );
}
