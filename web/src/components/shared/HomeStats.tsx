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
    {
      label: 'Cities',
      value: filters.cities.length.toLocaleString(),
      icon: MapPin,
      accent: 'text-teal-600',
      iconWrap: 'bg-teal-50 text-teal-600',
    },
    {
      label: 'Years of History',
      value: yearsOfHistory(r.date_range.from, r.date_range.to),
      icon: CalendarDays,
      accent: 'text-indigo-600',
      iconWrap: 'bg-indigo-50 text-indigo-600',
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
    <section className="w-full max-w-3xl" aria-label="Dataset summary statistics">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="group flex flex-col gap-1 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${s.iconWrap}`}
              >
                <Icon size={16} />
              </span>
              <span className={`mt-1 text-lg font-bold leading-tight ${s.accent}`}>{s.value}</span>
              <span className="text-xs font-medium text-gray-500">{s.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
