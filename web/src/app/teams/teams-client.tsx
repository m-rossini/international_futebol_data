'use client';

import { FilterBar } from '@/components/shared/FilterBar';
import { TeamStandingsTable } from '@/components/shared/TeamStandingsTable';

export function TeamsClient() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Teams</h1>
      <FilterBar />
      <TeamStandingsTable />
    </div>
  );
}
