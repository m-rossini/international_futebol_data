'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { CountryFlag } from '@/components/shared/CountryFlag';
import type { CityListItem } from '@/lib/types';

interface Props {
  country: string;
  cities: CityListItem[];
  error: string | null;
}

export function CountryCitiesClient({ country, cities, error }: Props) {
  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/countries" className="text-gray-400 hover:text-blue-600" onClick={() => {}}>
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{country}</h1>
        </div>
        <p className="text-sm text-red-500 mt-4">Error: {error}</p>
      </div>
    );
  }

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
      key: 'unique_teams',
      header: 'Teams',
      sortable: true,
      render: (r) => r.unique_teams.toLocaleString(),
    },
    {
      key: 'tournaments',
      header: 'Tournaments',
      sortable: true,
      render: (r) => r.tournaments.toLocaleString(),
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
        <Link
          href={`/country/${encodeURIComponent(country)}`}
          className="text-gray-400 hover:text-blue-600"
          onClick={() => {}}
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
          <CountryFlag countryName={country} size={22} />
          Cities in {country}
        </h1>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        {cities.length.toLocaleString()} {cities.length === 1 ? 'city' : 'cities'} where matches
        have been played in {country}
      </p>
      {cities.length > 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <DataTable
            columns={columns}
            data={cities}
            keyField="city"
            defaultSort={{ key: 'matches', dir: 'desc' }}
          />
        </div>
      ) : (
        <p className="text-sm text-gray-400">No city data recorded.</p>
      )}
    </div>
  );
}
