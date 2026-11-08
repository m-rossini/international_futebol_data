'use client';

import { useEffect, useState } from 'react';
import { Users, Trophy, Target, CalendarDays, MapPin, Globe, Goal } from 'lucide-react';
import { logApiCall } from '@/lib/observability';

const API = '/api/proxy';

// Minimal shapes of the two endpoints we consume (see api SummaryResponse /
// FilterOptionsResponse). Only the fields we display are declared.
interface SummaryResponse {
  results: {
    total_matches: number;
    total_goals: number;
    date_range: { from: string | null; to: string | null };
  };
  goalscorers: {
    unique_scorers: number;
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

function yearsOfHistory(from: string | null, to: string | null): string {
  if (!from || !to) return '—';
  const start = new Date(from).getFullYear();
  const end = new Date(to).getFullYear();
  if (Number.isNaN(start) || Number.isNaN(end)) return '—';
  return `${start}–${end}`;
}

function buildStats(summary: SummaryResponse, filters: FilterOptionsResponse): Stat[] {
  const r = summary.results;
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
      label: 'Unique Scorers',
      value: summary.goalscorers.unique_scorers.toLocaleString(),
      icon: Goal,
      accent: 'text-rose-600',
      iconWrap: 'bg-rose-50 text-rose-600',
    },
    {
      label: 'Countries',
      value: filters.countries.length.toLocaleString(),
      icon: Globe,
      accent: 'text-sky-600',
      iconWrap: 'bg-sky-50 text-sky-600',
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
      <div className="w-full max-w-3xl text-center">
        <p className="text-sm text-gray-400">Stats unavailable right now.</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="w-full max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-3" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
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
