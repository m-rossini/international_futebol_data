'use client';

import { useMemo, useCallback } from 'react';
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

interface Props {
  confederations: ConfederationListItem[];
}

export function ConfederationsClient({ confederations }: Props) {
  const sp = useSearchParams();
  const router = useRouter();

  const qs = useMemo(() => buildQs(sp), [sp]);

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
      <DataTable
        columns={columns}
        data={confederations}
        keyField="name"
        defaultSort={{ key: 'name', dir: 'asc' }}
        onRowClick={handleRowClick}
      />
    </div>
  );
}
