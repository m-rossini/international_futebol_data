'use client';

import { useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BarDatum {
  year: number;
  wins: number;
  losses: number;
  draws: number;
  matches_played: number;
}

interface Props {
  data: BarDatum[];
  height?: number;
  /** Explicit pixel width (bypasses ResponsiveContainer — useful for tests). */
  width?: number;
}

// ---------------------------------------------------------------------------
// Series config
// ---------------------------------------------------------------------------

const SERIES = [
  { dataKey: 'wins' as const, color: '#22c55e', label: 'Wins' },
  { dataKey: 'draws' as const, color: '#f59e0b', label: 'Draws' },
  { dataKey: 'losses' as const, color: '#ef4444', label: 'Losses' },
] as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function YearlyChart({ data, height = 240, width }: Props) {
  const sorted = useMemo(() => [...data].sort((a, b) => a.year - b.year), [data]);

  // X-axis ticks: show all years for small sets, spaced subset for large
  const xTicks = useMemo(() => {
    if (sorted.length <= 8) return sorted.map((d) => d.year);
    const step = Math.max(1, Math.floor(sorted.length / 6));
    const ticks: number[] = [];
    for (let i = 0; i < sorted.length; i += step) ticks.push(sorted[i].year);
    const lastYear = sorted[sorted.length - 1].year;
    if (ticks[ticks.length - 1] !== lastYear) ticks.push(lastYear);
    return ticks;
  }, [sorted]);

  if (data.length === 0) {
    return <div className="text-center text-xs text-gray-400 py-2">No yearly data available</div>;
  }

  const chart = (
    <ComposedChart
      data={sorted}
      width={width}
      height={height}
      margin={{ top: 8, right: 40, bottom: 20, left: 4 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

      <XAxis
        dataKey="year"
        type="number"
        domain={['dataMin', 'dataMax']}
        ticks={xTicks}
        interval={0}
        tick={{ fontSize: 10, fill: '#9ca3af' }}
        tickLine={false}
        axisLine={{ stroke: '#e5e7eb' }}
      />

      <YAxis
        yAxisId="wdl"
        tick={{ fontSize: 10, fill: '#9ca3af' }}
        tickLine={false}
        axisLine={{ stroke: '#e5e7eb' }}
        allowDecimals={false}
      />

      <YAxis
        yAxisId="total"
        orientation="right"
        tick={{ fontSize: 10, fill: '#9ca3af' }}
        tickLine={false}
        axisLine={{ stroke: '#e5e7eb' }}
        allowDecimals={false}
      />

      <Tooltip
        contentStyle={{ fontSize: 11, borderRadius: 6 }}
        formatter={(value: number, name: string) => {
          if (name === 'Total Matches') return [value, 'Total Matches'];
          return [value, name];
        }}
        labelFormatter={(year: number) => `Year: ${year}`}
      />

      <Legend
        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        iconType="circle"
        iconSize={10}
        verticalAlign="bottom"
      />

      {SERIES.map((s) => (
        <Bar
          key={s.dataKey}
          yAxisId="wdl"
          dataKey={s.dataKey}
          stackId="wdl"
          fill={s.color}
          name={s.label}
        />
      ))}

      <Line
        yAxisId="total"
        type="monotone"
        dataKey="matches_played"
        name="Total Matches"
        stroke="#6366f1"
        strokeWidth={2}
        dot={false}
      />
    </ComposedChart>
  );

  return (
    <div className="w-full" role="img" aria-label="Wins / Draws / Losses per year">
      {width != null ? (
        chart
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {chart}
        </ResponsiveContainer>
      )}
    </div>
  );
}
