'use client';

import Link from 'next/link';
import { type Column } from '@/components/shared/DataTable';
import { CountryFlag } from '@/components/shared/CountryFlag';
import type { TeamItem } from '@/lib/types';

export function winRateColor(rate: number): string {
  if (rate >= 60) return 'text-green-600 font-semibold';
  if (rate >= 45) return 'text-amber-600 font-semibold';
  return 'text-red-500 font-semibold';
}

function eloColor(rating: number | null): string {
  if (rating === null) return 'text-gray-400';
  if (rating >= 1700) return 'text-green-600 font-semibold';
  if (rating >= 1500) return 'text-amber-600 font-semibold';
  return 'text-red-500 font-semibold';
}

export const TEAMS_COLUMNS: Column<TeamItem>[] = [
  {
    key: 'team',
    header: 'Team',
    sortable: true,
    render: (row) => (
      <Link
        href={`/teams/${encodeURIComponent(row.team)}`}
        className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        <CountryFlag countryName={row.team} size={14} />
        {row.team}
      </Link>
    ),
  },
  {
    key: 'matches_played',
    header: 'Matches',
    sortable: true,
    render: (row) => row.matches_played.toLocaleString(),
  },
  {
    key: 'wins',
    header: 'Wins',
    sortable: true,
    render: (row) => row.wins.toLocaleString(),
  },
  {
    key: 'losses',
    header: 'Losses',
    sortable: true,
    render: (row) => row.losses.toLocaleString(),
  },
  {
    key: 'draws',
    header: 'Draws',
    sortable: true,
    render: (row) => row.draws.toLocaleString(),
  },
  {
    key: 'points',
    header: 'Pts',
    sortable: true,
    render: (row) => <span className="font-bold text-gray-900">{row.points.toLocaleString()}</span>,
  },
  {
    key: 'win_rate',
    header: 'Win Rate',
    sortable: true,
    render: (row) => <span className={winRateColor(row.win_rate)}>{row.win_rate.toFixed(1)}%</span>,
  },
  {
    key: 'elo_rating',
    header: 'ELO',
    sortable: true,
    compare: (a, b) => (a.elo_rating ?? 0) - (b.elo_rating ?? 0),
    render: (row) =>
      row.elo_rating != null ? (
        <span className={eloColor(row.elo_rating)}>{row.elo_rating.toLocaleString()}</span>
      ) : (
        <span className="text-gray-400">\u2014</span>
      ),
  },
  {
    key: 'elo_ranking',
    header: 'Rank',
    sortable: true,
    compare: (a, b) => (a.elo_ranking ?? 9999) - (b.elo_ranking ?? 9999),
    render: (row) =>
      row.elo_ranking != null ? (
        <span className="text-gray-700">#{row.elo_ranking.toLocaleString()}</span>
      ) : (
        <span className="text-gray-400">\u2014</span>
      ),
  },
  {
    key: 'goals_for',
    header: 'GF',
    sortable: true,
    render: (row) => row.goals_for.toLocaleString(),
  },
  {
    key: 'goals_against',
    header: 'GA',
    sortable: true,
    render: (row) => row.goals_against.toLocaleString(),
  },
  {
    key: 'gf_ga_ratio',
    header: 'GF/GA',
    sortable: true,
    render: (row) => (row.goals_against > 0 ? row.gf_ga_ratio.toFixed(2) : '\u2014'),
  },
  {
    key: 'avg_gf',
    header: 'Avg GF',
    sortable: true,
    render: (row) => row.avg_gf.toFixed(2),
  },
  {
    key: 'avg_ga',
    header: 'Avg GA',
    sortable: true,
    render: (row) => row.avg_ga.toFixed(2),
  },
  {
    key: 'unique_countries',
    header: 'Countries',
    sortable: true,
    render: (row) => row.unique_countries.toLocaleString(),
  },
];
