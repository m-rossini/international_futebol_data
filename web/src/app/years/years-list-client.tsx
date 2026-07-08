'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { FilterBar } from '@/components/shared/FilterBar';
import { logApiCall, logUserAction } from '@/lib/observability';
import type { YearOverviewItem } from '@/lib/types';

const API = '/api/proxy';

function buildQs(params: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of ['teams', 'tournaments', 'countries', 'date_from', 'date_to']) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

const columns: Column<YearOverviewItem>[] = [
  {
    key: 'year',
    header: 'Year',
    sortable: true,
  },
  {
    key: 'matches',
    header: 'Matches',
    sortable: true,
    render: (row) => row.matches.toLocaleString(),
  },
  {
    key: 'goals',
    header: 'Goals',
    sortable: true,
    render: (row) => row.goals.toLocaleString(),
  },
  {
    key: 'avg_goals',
    header: 'Avg Goals',
    sortable: true,
    render: (row) => row.avg_goals.toFixed(2),
  },
  {
    key: 'countries',
    header: 'Countries',
    sortable: true,
  },
  {
    key: 'cities',
    header: 'Cities',
    sortable: true,
  },
  {
    key: 'largest_margin',
    header: 'Largest Margin',
    sortable: true,
  },
  {
    key: 'most_goals_match',
    header: 'Most Goals',
    sortable: true,
  },
];

export function YearsClient() {
  const sp = useSearchParams();
  const router = useRouter();
  const [years, setYears] = useState<YearOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => buildQs(sp), [sp]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const url = `${API}/years${qs ? '?' + qs : ''}`;
        const res = await fetch(url);
        const duration = performance.now() - t0;
        logApiCall('/years', duration, res.status, { query: qs || undefined });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: YearOverviewItem[] = await res.json();
        if (!cancelled) {
          setYears(data);
          setLoading(false);
        }
      } catch (err) {
        const duration = performance.now() - t0;
        logApiCall('/years', duration, 0, {
          query: qs || undefined,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load years');
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
    (row: YearOverviewItem) => {
      logUserAction('select_year', { page: 'years', year: row.year });
      const params = new URLSearchParams(sp.toString());
      const q = params.toString();
      router.push(`/years/${row.year}${q ? `?${q}` : ''}`);
    },
    [router, sp],
  );

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Years</h1>
      <FilterBar injectDefaults={false} />
      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Error: {error}</p>
      ) : (
        <DataTable
          columns={columns}
          data={years}
          keyField="year"
          defaultSort={{ key: 'year', dir: 'desc' }}
          onRowClick={handleRowClick}
        />
      )}
    </div>
  );
}
