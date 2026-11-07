'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { CountryFlag } from '@/components/shared/CountryFlag';
import { StatsBar, StatItem } from '@/components/shared/StatsBar';
import type { CountryDetail } from '@/lib/types';

interface Props {
  name: string;
  detail: CountryDetail | null;
  cities: { city: string; matches: number }[];
  error: string | null;
}

export function CountryClient({ name, detail, cities, error }: Props) {
  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/countries" className="text-gray-400 hover:text-blue-600" onClick={() => {}}>
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{name}</h1>
        </div>
        <p className="text-sm text-red-500 mt-4">Error: {error}</p>
      </div>
    );
  }

  if (!detail) {
    return <p className="p-8 text-sm text-gray-400">Loading...</p>;
  }

  const s = detail.summary;

  const items: StatItem[] = [
    { label: 'Matches', value: s.matches.toLocaleString() },
    { label: 'Home Wins', value: s.home_wins.toLocaleString(), accent: 'green' },
    { label: 'Away Wins', value: s.away_wins.toLocaleString(), accent: 'red' },
    { label: 'Draws', value: s.draws.toLocaleString(), accent: 'neutral' },
    { label: 'Total Goals', value: s.total_goals.toLocaleString(), accent: 'amber' },
    { label: 'Avg Goals/Match', value: s.avg_goals_per_match.toFixed(2), accent: 'blue' },
    { label: 'Teams', value: s.unique_teams.toLocaleString() },
    { label: 'Tournaments', value: s.unique_tournaments.toLocaleString() },
    { label: 'Cities', value: s.unique_cities.toLocaleString() },
  ];

  const cityColumns: Column<{ city: string; matches: number }>[] = [
    {
      key: 'city',
      header: 'City',
      sortable: true,
      render: (r) => (
        <Link
          href={`/city/${encodeURIComponent(r.city)}`}
          className="inline-flex items-center gap-1.5 text-blue-600 hover:underline"
        >
          <CountryFlag countryName={name} size={14} />
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
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/countries" className="text-gray-400 hover:text-blue-600" onClick={() => {}}>
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
          <CountryFlag countryName={name} size={22} />
          {name}
        </h1>
      </div>

      <StatsBar items={items} />

      {/* Top cities */}
      <div className="mt-8 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Top Host Cities ({cities.length} shown)
        </h2>
        {cities.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <DataTable
              columns={cityColumns}
              data={cities}
              keyField="city"
              defaultSort={{ key: 'matches', dir: 'desc' }}
            />
          </div>
        ) : (
          <p className="text-sm text-gray-400">No city data recorded.</p>
        )}
        <p className="mt-2 text-xs text-gray-500">
          See all{' '}
          <Link
            href={`/country/${encodeURIComponent(name)}/cities`}
            className="text-blue-600 hover:underline"
          >
            cities
          </Link>{' '}
          where matches have been played in {name}.
        </p>
      </div>
    </div>
  );
}
