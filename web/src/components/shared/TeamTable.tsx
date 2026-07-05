'use client';

import { useMemo } from 'react';
import { DataTable } from '@/components/shared/DataTable';
import { FilterBar } from '@/components/shared/FilterBar';
import { TEAMS_COLUMNS } from '@/lib/team-columns';
import type { TeamItem } from '@/lib/types';
import type { SortDir } from '@/components/shared/DataTable';

interface Props {
  data: TeamItem[];
  loading?: boolean;
  error?: string | null;
  sortKey?: string | null;
  sortDir?: SortDir;
  onSortChange?: (key: string | null, dir: SortDir) => void;
  onRowClick?: (row: TeamItem) => void;
  minMatches?: number;
  onMinMatchesChange?: (value: number) => void;
  defaultSort?: { key: string; dir: 'asc' | 'desc' };
}

export function TeamTable({
  data,
  loading = false,
  error = null,
  sortKey,
  sortDir,
  onSortChange,
  onRowClick,
  minMatches = 0,
  onMinMatchesChange,
  defaultSort = { key: 'matches_played', dir: 'desc' },
}: Props) {
  const filteredData = useMemo(() => {
    if (minMatches <= 0) return data;
    return data.filter((t) => t.matches_played >= minMatches);
  }, [data, minMatches]);

  return (
    <div>
      {onMinMatchesChange && (
        <FilterBar
          fields={{ teams: false, tournaments: false, countries: false, dates: false }}
          injectDefaults={false}
        >
          <div className="flex flex-col gap-1 w-[140px]">
            <label className="text-xs font-medium text-gray-500">Min. matches</label>
            <input
              type="number"
              min={0}
              value={minMatches || ''}
              onChange={(e) => onMinMatchesChange(Number(e.target.value))}
              placeholder="0"
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
            />
          </div>
        </FilterBar>
      )}
      {loading ? (
        <p className="text-sm text-gray-400">Loading teams...</p>
      ) : error ? (
        <p className="text-sm text-red-500">Error: {error}</p>
      ) : (
        <DataTable
          columns={TEAMS_COLUMNS}
          data={filteredData}
          keyField="team"
          defaultSort={defaultSort}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={onSortChange}
          onRowClick={onRowClick}
        />
      )}
    </div>
  );
}
