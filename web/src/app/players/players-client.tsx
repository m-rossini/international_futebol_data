'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { logApiCall } from '@/lib/observability';
import type { PlayerListItem } from '@/lib/types';

const API = '/api/proxy';

export function PlayersClient() {
  const [players, setPlayers] = useState<PlayerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const res = await fetch(`${API}/players`);
        const duration = performance.now() - t0;
        logApiCall('/players', duration, res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: PlayerListItem[] = await res.json();
        if (!cancelled) {
          setPlayers(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load players');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: Column<PlayerListItem>[] = [
    {
      key: 'name',
      header: 'Player',
      sortable: true,
      render: (r) => (
        <Link
          href={`/player/${encodeURIComponent(r.name)}`}
          className="text-blue-600 hover:underline font-medium"
        >
          {r.name}
        </Link>
      ),
    },
    {
      key: 'goals',
      header: 'Goals',
      sortable: true,
      render: (r) => r.goals.toLocaleString(),
    },
    {
      key: 'matches',
      header: 'Matches',
      sortable: true,
      render: (r) => r.matches.toLocaleString(),
    },
    {
      key: 'teams',
      header: 'Teams',
      sortable: true,
      render: (r) => r.teams.join(', '),
    },
    {
      key: 'first_year',
      header: 'First',
      sortable: true,
      render: (r) => (r.first_year == null ? '—' : String(r.first_year)),
    },
    {
      key: 'last_year',
      header: 'Last',
      sortable: true,
      render: (r) => (r.last_year == null ? '—' : String(r.last_year)),
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Players</h1>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500 mt-4">Error: {error}</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{players.length.toLocaleString()} players</p>
          <DataTable
            columns={columns}
            data={players}
            keyField="player_id"
            defaultSort={{ key: 'goals', dir: 'desc' }}
          />
        </>
      )}
    </div>
  );
}
