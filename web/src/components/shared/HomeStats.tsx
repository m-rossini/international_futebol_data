'use client';

import { useEffect, useState } from 'react';
import { Users, Trophy, Target, MapPin, Globe, Goal, Clock, Flag } from 'lucide-react';
import { logApiCall } from '@/lib/observability';

const API = '/api/proxy';

// Minimal shapes of the endpoints we consume (see api SummaryResponse /
// FilterOptionsResponse). Only the fields we display are declared.
interface SummaryResponse {
  results: {
    total_matches: number;
    total_goals: number;
    tournaments_count: number;
    avg_goals_per_match: number;
    date_range: { from: string | null; to: string | null };
    home_advantage: {
      home_wins: number;
      away_wins: number;
      draws: number;
      home_win_pct: number;
      away_win_pct: number;
      draw_pct: number;
    };
    goal_distribution: {
      total_goals: { mean: number; min: number; max: number; p25: number; p75: number };
    };
  };
  goalscorers: {
    total_goals_recorded: number;
    unique_scorers: number;
    unique_teams_scored_for: number;
    own_goals: number;
    penalty_goals: number;
    scorer_distribution: {
      goals_per_scorer: { mean: number; max: number; median: number };
    };
  };
  shootouts: {
    total_shootouts: number;
    unique_winners: number;
  };
  former_names: {
    total_renamed_countries: number;
  };
}

interface FilterOptionsResponse {
  teams: string[];
  tournaments: string[];
  countries: string[];
  cities: string[];
}

interface Stat {
  label: string;
  value: string;
  icon: typeof Users;
  accent: string;
  iconWrap: string;
}

function buildStats(summary: SummaryResponse, filters: FilterOptionsResponse): Stat[] {
  const r = summary.results;
  const g = summary.goalscorers;
  const s = summary.shootouts;
  const f = summary.former_names;
  const ha = r.home_advantage;
  const gpg = g.scorer_distribution.goals_per_scorer;

  return [
    {
      label: 'Matches Recorded',
      value: r.total_matches.toLocaleString(),
      icon: Trophy,
      accent: 'text-blue-600',
      iconWrap: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Goals Scored',
      value: r.total_goals.toLocaleString(),
      icon: Goal,
      accent: 'text-emerald-600',
      iconWrap: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Avg Goals/Match',
      value: r.avg_goals_per_match.toFixed(2),
      icon: Clock,
      accent: 'text-indigo-600',
      iconWrap: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'National Teams',
      value: filters.teams.length.toLocaleString(),
      icon: Users,
      accent: 'text-violet-600',
      iconWrap: 'bg-violet-50 text-violet-600',
    },
    {
      label: 'Tournaments',
      value: filters.tournaments.length.toLocaleString(),
      icon: Target,
      accent: 'text-amber-600',
      iconWrap: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Countries',
      value: filters.countries.length.toLocaleString(),
      icon: Globe,
      accent: 'text-sky-600',
      iconWrap: 'bg-sky-50 text-sky-600',
    },
    {
      label: 'Cities',
      value: filters.cities.length.toLocaleString(),
      icon: MapPin,
      accent: 'text-teal-600',
      iconWrap: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Unique Scorers',
      value: g.unique_scorers.toLocaleString(),
      icon: Goal,
      accent: 'text-rose-600',
      iconWrap: 'bg-rose-50 text-rose-600',
    },
    {
      label: 'Goals per Scorer',
      value: gpg.mean.toFixed(1),
      icon: Goal,
      accent: 'text-rose-600',
      iconWrap: 'bg-rose-50 text-rose-600',
    },
    {
      label: 'Home Wins',
      value: ha.home_wins.toLocaleString(),
      icon: Users,
      accent: 'text-green-600',
      iconWrap: 'bg-green-50 text-green-600',
    },
    {
      label: 'Away Wins',
      value: ha.away_wins.toLocaleString(),
      icon: Users,
      accent: 'text-red-600',
      iconWrap: 'bg-red-50 text-red-600',
    },
    {
      label: 'Draws',
      value: ha.draws.toLocaleString(),
      icon: Clock,
      accent: 'text-gray-600',
      iconWrap: 'bg-gray-50 text-gray-600',
    },
    {
      label: 'Home Win %',
      value: ha.home_win_pct.toFixed(1) + '%',
      icon: Users,
      accent: 'text-green-600',
      iconWrap: 'bg-green-50 text-green-600',
    },
    {
      label: 'Away Win %',
      value: ha.away_win_pct.toFixed(1) + '%',
      icon: Users,
      accent: 'text-red-600',
      iconWrap: 'bg-red-50 text-red-600',
    },
    {
      label: 'Draw %',
      value: ha.draw_pct.toFixed(1) + '%',
      icon: Clock,
      accent: 'text-gray-600',
      iconWrap: 'bg-gray-50 text-gray-600',
    },
    {
      label: 'Shootouts',
      value: s.total_shootouts.toLocaleString(),
      icon: Clock,
      accent: 'text-amber-600',
      iconWrap: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Own Goals',
      value: g.own_goals.toLocaleString(),
      icon: Goal,
      accent: 'text-rose-600',
      iconWrap: 'bg-rose-50 text-rose-600',
    },
    {
      label: 'Penalty Goals',
      value: g.penalty_goals.toLocaleString(),
      icon: Goal,
      accent: 'text-emerald-600',
      iconWrap: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Defunct Nations',
      value: f.total_renamed_countries.toLocaleString(),
      icon: Flag,
      accent: 'text-gray-600',
      iconWrap: 'bg-gray-50 text-gray-600',
    },
  ];
}

export function HomeStats() {
  const [stats, setStats] = useState<Stat[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const t0 = performance.now();
      try {
        const [summaryRes, filtersRes] = await Promise.all([
          fetch(`${API}/summary`),
          fetch(`${API}/filters`),
        ]);
        const duration = performance.now() - t0;
        logApiCall('/summary + /filters', duration, summaryRes.status, { page: 'home' });
        if (!summaryRes.ok || !filtersRes.ok) throw new Error('Failed to load stats');

        const summary: SummaryResponse = await summaryRes.json();
        const filters: FilterOptionsResponse = await filtersRes.json();
        if (!cancelled) {
          setStats(buildStats(summary, filters));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load stats');
          setStats(null);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="w-full max-w-6xl text-center">
        <p className="text-sm text-gray-400">Stats unavailable right now.</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="w-full max-w-6xl grid grid-cols-3 gap-4" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  return (
    <section className="w-full max-w-6xl" aria-label="Dataset summary statistics">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="group flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-lg transition-all duration-200"
            >
              <span
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${s.iconWrap} mb-2`}
              >
                <Icon size={20} />
              </span>
              <span className={`text-2xl font-bold leading-tight ${s.accent}`}>{s.value}</span>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
