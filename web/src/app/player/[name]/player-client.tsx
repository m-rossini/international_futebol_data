'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DataTable, type Column } from '@/components/shared/DataTable';
import { StatsBar, StatItem } from '@/components/shared/StatsBar';
import type { PlayerDetailResponse } from '@/lib/types';

interface Props {
  name: string;
  detail: PlayerDetailResponse | null;
  error: string | null;
}

export function PlayerClient({ name, detail, error }: Props) {
  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/players" className="text-gray-400 hover:text-blue-600" onClick={() => {}}>
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
    { label: 'Goals', value: s.goals.toLocaleString(), accent: 'amber' },
    { label: 'Matches', value: s.matches.toLocaleString() },
    {
      label: 'Teams',
      value: s.teams.length > 0 ? s.teams.join(', ') : '—',
    },
    {
      label: 'Career',
      value: s.first_year != null && s.last_year != null ? `${s.first_year}–${s.last_year}` : '—',
    },
    {
      label: 'Tournaments',
      value: s.tournaments.length > 0 ? s.tournaments.join(', ') : '—',
    },
  ];

  const careerColumns: Column<{
    year: number;
    goals: number;
    matches: number;
    teams: string[];
    tournaments: string[];
  }>[] = [
    {
      key: 'year',
      header: 'Year',
      sortable: true,
    },
    {
      key: 'goals',
      header: 'Goals',
      sortable: true,
      render: (r) => r.goals.toLocaleString(),
    },
    {
      key: 'matches',
      header: 'Matches',
      sortable: true,
      render: (r) => r.matches.toLocaleString(),
    },
    {
      key: 'teams',
      header: 'Teams',
      render: (r) => r.teams.join(', '),
    },
    {
      key: 'tournaments',
      header: 'Tournaments',
      render: (r) => r.tournaments.join(', '),
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/players" className="text-gray-400 hover:text-blue-600" onClick={() => {}}>
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">{name}</h1>
      </div>

      <StatsBar items={items} />

      {/* Top teams by goals */}
      {detail.top_teams.length > 0 && (
        <div className="mt-8 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Top Teams by Goals</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <DataTable
              columns={[
                {
                  key: 'team',
                  header: 'Team',
                  sortable: true,
                },
                {
                  key: 'goals',
                  header: 'Goals',
                  sortable: true,
                  render: (r) => r.goals.toLocaleString(),
                },
              ]}
              data={detail.top_teams}
              keyField="team"
            />
          </div>
        </div>
      )}

      {/* Career by year */}
      {detail.career.length > 0 && (
        <div className="mt-8 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">Career by Year</h2>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <DataTable
              columns={careerColumns}
              data={detail.career}
              keyField="year"
              defaultSort={{ key: 'year', dir: 'desc' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
