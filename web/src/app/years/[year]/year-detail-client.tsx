'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { FilterBar } from '@/components/shared/FilterBar';
import { StatsBar, type StatItem } from '@/components/shared/StatsBar';
import { GoalsHistogramChart } from '@/components/shared/chart/GoalsHistogramChart';
import { logApiCall } from '@/lib/observability';
import type { YearDetail } from '@/lib/types';

const API = '/api/proxy';

function buildQs(params: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of ['teams', 'tournaments', 'countries', 'date_from', 'date_to']) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

interface CumulativeRow {
  idx: number;
  date: string;
  cumulativeMatches: number;
  cumulativeGoals: number;
}

function buildCumulativeData(matches: YearDetail['matches_list']): CumulativeRow[] {
  const sorted = [...matches].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const step = Math.max(1, Math.floor(sorted.length / 200));
  const sampled = step > 1 ? sorted.filter((_, i) => i % step === 0) : sorted;

  const rows: CumulativeRow[] = [];
  let cumMatches = 0;
  let cumGoals = 0;

  for (let i = 0; i < sampled.length; i++) {
    const m = sampled[i];
    cumMatches += 1;
    cumGoals += m.home_score + m.away_score;
    rows.push({
      idx: i,
      date: m.date,
      cumulativeMatches: cumMatches,
      cumulativeGoals: cumGoals,
    });
  }

  return rows;
}

interface Props {
  year: number;
}

export function YearDetailClient({ year }: Props) {
  const sp = useSearchParams();
  const [data, setData] = useState<YearDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const qs = useMemo(() => buildQs(sp), [sp]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const t0 = performance.now();
      try {
        const url = `${API}/years/${year}${qs ? '?' + qs : ''}`;
        const res = await fetch(url);
        const duration = performance.now() - t0;
        logApiCall(`/years/${year}`, duration, res.status, { query: qs || undefined });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: YearDetail = await res.json();
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      } catch (err) {
        const duration = performance.now() - t0;
        logApiCall(`/years/${year}`, duration, 0, {
          query: qs || undefined,
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load year');
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [year, qs]);

  const stats: StatItem[] = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Matches', value: data.matches.toLocaleString() },
      { label: 'Goals', value: data.goals.toLocaleString(), accent: 'blue' },
      {
        label: 'Avg Goals',
        value: data.avg_goals.toFixed(2),
        accent: data.avg_goals >= 3 ? 'green' : data.avg_goals >= 2 ? 'amber' : 'neutral',
      },
      { label: 'Countries', value: data.countries.toLocaleString() },
      { label: 'Cities', value: data.cities.toLocaleString() },
      {
        label: 'Largest Margin',
        value: data.largest_margin.toLocaleString(),
        accent: 'red',
      },
      { label: 'Most Goals', value: data.most_goals_match.toLocaleString(), accent: 'amber' },
    ];
  }, [data]);

  const cumulativeData = useMemo(() => {
    if (!data?.matches_list) return [];
    return buildCumulativeData(data.matches_list);
  }, [data]);

  if (loading) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Year {year}</h1>
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 md:p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Year {year}</h1>
        <p className="text-sm text-red-500">Error: {error ?? 'Not found'}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <Link
        href="/years"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft size={14} />
        All Years
      </Link>
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Year {year}</h1>
      <FilterBar injectDefaults={false} />

      <div className="mt-6">
        <StatsBar items={stats} />
      </div>

      {/* Cumulative charts — two columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Cumulative Matches</h2>
          <div className="w-full" role="img" aria-label="Cumulative matches over the year">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={cumulativeData} margin={{ top: 8, right: 20, bottom: 8, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="idx"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={() => ''}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 6 }}
                  labelFormatter={(_val, payload) => {
                    const p = payload?.[0]?.payload as CumulativeRow | undefined;
                    return p?.date ?? '';
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeMatches"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Cumulative Goals</h2>
          <div className="w-full" role="img" aria-label="Cumulative goals over the year">
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={cumulativeData} margin={{ top: 8, right: 20, bottom: 8, left: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="idx"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickFormatter={() => ''}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#9ca3af' }}
                  tickLine={false}
                  axisLine={{ stroke: '#e5e7eb' }}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ fontSize: 11, borderRadius: 6 }}
                  labelFormatter={(_val, payload) => {
                    const p = payload?.[0]?.payload as CumulativeRow | undefined;
                    return p?.date ?? '';
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeGoals"
                  stroke="#10b981"
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Goals histogram — full width */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mt-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Goals per Match Distribution</h2>
        <GoalsHistogramChart data={data.goals_histogram} />
      </div>
    </div>
  );
}
