'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { CountryFlag } from '@/components/shared/CountryFlag';
import { logApiCall } from '@/lib/observability';
import type { CountryListItem } from '@/lib/types';

const API = '/api/proxy';

export function CountriesClient() {
  const [countries, setCountries] = useState<CountryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const res = await fetch(`${API}/countries`);
        const duration = performance.now() - t0;
        logApiCall('/countries', duration, res.status);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: CountryListItem[] = await res.json();
        if (!cancelled) {
          setCountries(data);
          setError(null);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load countries');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const columns: Column<CountryListItem>[] = [
    {
      key: 'country',
      header: 'Country',
      sortable: true,
      render: (r) => (
        <Link
          href={`/country/${encodeURIComponent(r.country)}`}
          className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
        >
          <CountryFlag countryName={r.country} size={14} />
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
      key: 'cities',
      header: 'Cities',
      sortable: true,
      render: (r) => r.cities.toLocaleString(),
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
      <div className="flex items-center gap-2 mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Countries</h1>
      </div>
      {loading ? (
        <p className="text-sm text-gray-400 mt-4">Loading...</p>
      ) : error ? (
        <p className="text-sm text-red-500 mt-4">Error: {error}</p>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-4">
            {countries.length.toLocaleString()} countries
          </p>
          <DataTable
            columns={columns}
            data={countries}
            keyField="country"
            defaultSort={{ key: 'matches', dir: 'desc' }}
          />
        </>
      )}
    </div>
  );
}
