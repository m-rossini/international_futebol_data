'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { StatsBar, StatItem } from '@/components/shared/StatsBar';
import { CountryFlag } from '@/components/shared/CountryFlag';
import type { CityDetail } from '@/lib/types';

interface Props {
  name: string;
  detail: CityDetail | null;
  error: string | null;
}

export function CityClient({ name, detail, error }: Props) {
  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/cities" className="text-gray-400 hover:text-blue-600" onClick={() => {}}>
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
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/cities" className="text-gray-400 hover:text-blue-600" onClick={() => {}}>
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800 inline-flex items-center gap-2">
          <CountryFlag countryName={detail.country} size={22} />
          {name}
        </h1>
        <span className="text-sm text-gray-500">{detail.country}</span>
      </div>

      <StatsBar items={items} />

      <p className="mt-4 text-sm text-gray-500">
        All matches played in {name}{' '}
        {s.first_year && s.last_year && `(${s.first_year}–${s.last_year})`}.
      </p>
    </div>
  );
}
