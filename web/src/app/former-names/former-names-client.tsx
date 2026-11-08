'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { logApiCall } from '@/lib/observability';
import type { FormerNameItem } from '@/lib/types';

const API = '/api/proxy';

export function FormerNamesClient() {
  const [chains, setChains] = useState<FormerNameItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const res = await fetch(`${API}/former-names`);
        const duration = performance.now() - t0;
        logApiCall('/former-names', duration, res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setChains(data.chains || []);
          setTotal(data.total || 0);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load former names');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: Column<FormerNameItem>[] = [
    {
      key: 'current',
      header: 'Current',
      sortable: true,
    },
    {
      key: 'former',
      header: 'Former Name',
      sortable: true,
      render: (r) => (
        <Link
          href={`/country/${encodeURIComponent(r.former)}`}
          className="text-blue-600 hover:underline"
        >
          {r.former}
        </Link>
      ),
    },
    {
      key: 'start_date',
      header: 'From',
      sortable: true,
    },
    {
      key: 'end_date',
      header: 'To',
      sortable: true,
      render: (r) => (r.end_date ? r.end_date : 'present'),
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Former Names</h1>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        {total.toLocaleString()} team name chains. Links go to the current team page; click the
        former name to see matches under that name.
      </p>

      {loading ? (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500 mt-4">Error: {error}</p>
      ) : (
        <DataTable
          columns={columns}
          data={chains}
          keyField="current"
          defaultSort={{ key: 'current', dir: 'asc' }}
        />
      )}
    </div>
  );
}
