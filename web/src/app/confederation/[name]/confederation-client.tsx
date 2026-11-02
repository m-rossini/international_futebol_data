'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { FilterBar } from '@/components/shared/FilterBar';
import { StatsBar } from '@/components/shared/StatsBar';
import { BiggestWinsCard } from '@/components/shared/BiggestWinsCard';
import { MatchTable } from '@/components/shared/MatchTable';
import { GoalsHistogramChart } from '@/components/shared/chart/GoalsHistogramChart';
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

  // Derive match outcome stats from the match list
  const homeWins = matches.filter((m) => m.home_score > m.away_score).length;
  const awayWins = matches.filter((m) => m.home_score < m.away_score).length;
  const draws = matches.filter((m) => m.home_score === m.away_score).length;
  const totalGoals = matches.reduce((sum, m) => sum + m.home_score + m.away_score, 0);
  const avgGoals = matches.length > 0 ? totalGoals / matches.length : 0;

  // Biggest margin win
  const biggestWin = matches.reduce<MatchItem | null>((max, m) => {
    const margin = Math.abs(m.home_score - m.away_score);
    return !max || margin > Math.abs(max.home_score - max.away_score) ? m : max;
  }, null);

  // Goals per match distribution for histogram
  const goalsDistribution = matches.reduce<Record<string, number>>((acc, m) => {
    const g = m.home_score + m.away_score;
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});

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

      {/* Summary stats */}
      <div className="mb-6 mt-2">
        <StatsBar
          items={[
            { label: 'Matches', value: detail.total_matches.toLocaleString() },
            { label: 'Home Wins', value: homeWins.toLocaleString(), accent: 'green' },
            { label: 'Away Wins', value: awayWins.toLocaleString(), accent: 'red' },
            { label: 'Draws', value: draws.toLocaleString(), accent: 'neutral' },
            { label: 'Total Goals', value: totalGoals.toLocaleString(), accent: 'amber' },
            { label: 'Avg Goals/Match', value: avgGoals.toFixed(1), accent: 'blue' },
          ]}
        />
      </div>

      {/* Goals distribution chart */}
      {matches.length > 0 && (
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Goals per Match Distribution
            </h3>
            <GoalsHistogramChart data={goalsDistribution} unit="goals" />
          </div>
        </div>
      )}

      {/* Biggest win */}
      {biggestWin && (
        <div className="mb-6">
          <BiggestWinsCard
            team={biggestWin.home_team}
            opponent={biggestWin.away_team}
            wins={[
              {
                ...biggestWin,
                goal_margin: Math.abs(biggestWin.home_score - biggestWin.away_score),
              },
            ]}
          />
        </div>
      )}

      {/* Match history */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">
            Match History ({matches.length} matches)
          </h2>
        </div>
        <MatchTable matches={matches} showNeutral />
      </div>
    </div>
  );
}
