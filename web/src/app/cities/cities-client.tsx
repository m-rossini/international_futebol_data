'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { CountryFlag } from '@/components/shared/CountryFlag';
import { logApiCall } from '@/lib/observability';
import type { CityListItem } from '@/lib/types';

const API = '/api/proxy';

export function CitiesClient() {
  const [cities, setCities] = useState<CityListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const res = await fetch(`${API}/cities`);
        const duration = performance.now() - t0;
        logApiCall('/cities', duration, res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: CityListItem[] = await res.json();
        if (!cancelled) {
          setCities(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load cities');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: Column<CityListItem>[] = [
    {
      key: 'city',
      header: 'City',
      sortable: true,
      render: (r) => (
        <Link
          href={`/city/${encodeURIComponent(r.city)}`}
          className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
        >
          <CountryFlag countryName={r.country} size={14} />
          {r.city}
        </Link>
      ),
    },
    {
      key: 'country',
      header: 'Country',
      sortable: true,
      render: (r) => (
        <Link
          href={`/country/${encodeURIComponent(r.country)}`}
          className="text-gray-600 hover:text-blue-600 hover:underline"
        >
          {r.country}
        </Link>
      ),
    },
    {
      key: 'matches',
      header: 'Matches',
      sortable: true,
      render: (r) => r.matches.toLocaleString(),
    },
    {
      key: 'total_goals',
      header: 'Goals',
      sortable: true,
      render: (r) => r.total_goals.toLocaleString(),
    },
    {
      key: 'first_year',
      header: 'First',
      sortable: true,
    },
    {
      key: 'last_year',
      header: 'Last',
      sortable: true,
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Cities</h1>
      {loading ? (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500 mt-4">Error: {error}</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">{cities.length.toLocaleString()} cities</p>
          <DataTable
            columns={columns}
            data={cities}
            keyField="city"
            defaultSort={{ key: 'matches', dir: 'desc' }}
          />
        </>
      )}
    </div>
  );
}
