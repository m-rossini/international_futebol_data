'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { FilterBar } from '@/components/shared/FilterBar';
import { logApiCall, logUserAction } from '@/lib/observability';
import type { ConfederationListItem } from '@/lib/types';

const API = '/api/proxy';

function buildQs(params: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of [
    'teams',
    'tournaments',
    'countries',
    'confederations',
    'date_from',
    'date_to',
  ]) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

const columns: Column<ConfederationListItem>[] = [
  {
    key: 'name',
    header: 'Confederation',
    sortable: true,
  },
  {
    key: 'count',
    header: 'Member countries',
    sortable: true,
    render: (row) => row.count.toLocaleString(),
  },
  {
    key: 'teams',
    header: 'Matchable team names',
    sortable: true,
    render: (row) => row.teams.length.toLocaleString(),
  },
];

export function ConfederationsClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const [confederations, setConfederations] = useState<ConfederationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => buildQs(sp), [sp]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const url = `${API}/confederations${qs ? '?' + qs : ''}`;
        const res = await fetch(url);
        const duration = performance.now() - t0;
        logApiCall('/confederations', duration, res.status, { query: qs || undefined });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: ConfederationListItem[] = await res.json();
        if (!cancelled) {
          setConfederations(data);
          setLoading(false);
        }
      } catch (err) {
        const duration = performance.now() - t0;
        logApiCall('/confederations', duration, 0, {
          query: qs || undefined,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load confederations');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [qs]);

  const handleRowClick = useCallback(
    (row: ConfederationListItem) => {
      logUserAction('select_confederation', {
        page: 'confederations',
        confederation: row.name,
      });
      const params = new URLSearchParams(sp.toString());
      const q = params.toString();
      router.push(`/confederation/${encodeURIComponent(row.name)}${q ? `?${q}` : ''}`);
    },
    [router, sp],
  );

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Confederations</h1>
      <p className="text-sm text-gray-500 mb-6">
        The six FIFA confederations. Click a confederation to see its matches and summary stats. Use
        the filters above to narrow the list.
      </p>
      <FilterBar injectDefaults={false} />
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Error: {error}</p>
      ) : (
        <DataTable
          columns={columns}
          data={confederations}
          keyField="name"
          defaultSort={{ key: 'name', dir: 'asc' }}
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
