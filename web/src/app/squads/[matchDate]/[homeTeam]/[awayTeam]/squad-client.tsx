'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { DataTable, type Column } from '@/components/shared/DataTable';
import type { SquadDetailResponse } from '@/lib/types';

interface Props {
  matchDate: string;
  homeTeam: string;
  awayTeam: string;
  detail: SquadDetailResponse | null;
  error: string | null;
}

export function SquadClient({ matchDate, homeTeam, awayTeam, detail, error }: Props) {
  if (error) {
    return (
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Link href="/squads" className="text-gray-400 hover:text-blue-600" onClick={() => {}}>
            <ArrowLeft size={16} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800">Squads</h1>
        </div>
        <p className="text-sm text-red-500 mt-4">Error: {error}</p>
      </div>
    );
  }

  if (!detail) {
    return <p className="p-8 text-sm text-gray-400">Loading...</p>;
  }

  const squadColumns: Column<{
    player_name: string;
    shirt_no: number | null;
    position: string | null;
    captain: boolean;
  }>[] = [
    {
      key: 'player_name',
      header: 'Player',
      sortable: true,
    },
    {
      key: 'shirt_no',
      header: 'Shirt',
      sortable: true,
      render: (r) => (r.shirt_no == null ? '—' : String(r.shirt_no)),
    },
    {
      key: 'position',
      header: 'Position',
      sortable: true,
      render: (r) => r.position ?? '—',
    },
    {
      key: 'captain',
      header: 'C',
      sortable: true,
      render: (r) => (r.captain ? '✓' : '—'),
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center gap-2 mb-4">
        <Link href="/squads" className="text-gray-400 hover:text-blue-600" onClick={() => {}}>
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">
          {detail.home_team} vs {detail.away_team}
        </h1>
        <p className="text-sm text-gray-500">{detail.match_date}</p>
      </div>

      {detail.squads.map((team) => (
        <div key={team.team} className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">{team.team}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Starting XI ({team.xi.length})
              </h3>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <DataTable columns={squadColumns} data={team.xi} keyField="player_name" />
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">
                Bench ({team.bench.length})
              </h3>
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <DataTable columns={squadColumns} data={team.bench} keyField="player_name" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
