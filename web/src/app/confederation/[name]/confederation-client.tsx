'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FilterBar } from '@/components/shared/FilterBar';
import { CountryFlag } from '@/components/shared/CountryFlag';
import { MatchTable } from '@/components/shared/MatchTable';
import { logUserAction } from '@/lib/observability';
import type { ConfederationDetail, MatchItem } from '@/lib/types';

interface Props {
  name: string;
  detail: ConfederationDetail | null;
  matches: MatchItem[];
  error: string | null;
}

export function ConfederationClient({ name, detail, matches, error }: Props) {
  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Link
            href="/confederations"
            className="text-gray-400 hover:text-blue-600"
            onClick={() => {}}
          >
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">{name}</h1>
        </div>
        <p className="text-sm text-red-500">Error: {error}</p>
      </div>
    );
  }

  if (!detail || !matches) {
    return <p className="p-8 text-sm text-gray-400">Loading...</p>;
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/confederations"
          className="text-gray-400 hover:text-blue-600"
          onClick={() => {}}
        >
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">{detail.confederation}</h1>
      </div>

      <FilterBar
        fields={{ teams: true, tournaments: true, countries: true, dates: true }}
        injectDefaults={false}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-500">Total matches</p>
          <p className="text-xl font-semibold text-gray-800">
            {detail.total_matches.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-500">Total goals</p>
          <p className="text-xl font-semibold text-gray-800">
            {detail.total_goals.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-500">Unique teams</p>
          <p className="text-xl font-semibold text-gray-800">
            {detail.unique_teams.toLocaleString()}
          </p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-xs text-gray-500">Tournaments</p>
          <p className="text-xl font-semibold text-gray-800">{detail.tournaments.length}</p>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-800 mb-2">
        Member countries ({detail.countries.length})
      </h2>
      <div className="flex flex-wrap gap-2 mb-6">
        {detail.countries.map((c) => (
          <span
            key={c}
            className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-100"
          >
            <CountryFlag countryName={c} size={12} /> {c}
          </span>
        ))}
      </div>

      <h2 className="text-lg font-semibold text-gray-800 mb-2">Matches</h2>
      <MatchTable matches={matches} />
    </div>
  );
}
