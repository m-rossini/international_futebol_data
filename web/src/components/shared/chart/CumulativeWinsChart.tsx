'use client';

import { useMemo } from 'react';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from 'recharts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Match {
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
}

interface Props {
  matches: Match[];
  team1: string;
  team2: string;
  height?: number;
  /** Explicit pixel width (bypasses ResponsiveContainer — useful for tests). */
  width?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CumulativeWinsChart({ matches, team1, team2, height = 240, width }: Props) {
  const chartData = useMemo(() => {
    if (matches.length === 0) return [];

    const sorted = [...matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    let t1 = 0;
    let t2 = 0;
    const rows: Record<string, number | string>[] = [];

    for (let mi = 0; mi < sorted.length; mi++) {
      const m = sorted[mi];
      const isHome = m.home_team === team1;
      const t1Score = isHome ? m.home_score : m.away_score;
      const t2Score = isHome ? m.away_score : m.home_score;

      if (t1Score > t2Score) t1++;
      else if (t2Score > t1Score) t2++;

      rows.push({ matchIndex: mi, date: m.date, t1, t2 });
    }

    return rows;
  }, [matches, team1]);

  if (matches.length === 0) {
    return <div className="text-center text-xs text-gray-400 py-2">No match data available</div>;
  }

  const lineChart = (
    <ComposedChart
      width={width}
      height={height}
      data={chartData}
      margin={{ top: 8, right: 20, bottom: 8, left: 4 }}
    >
      <defs>
        <linearGradient id="cwT1Grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="cwT2Grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
        </linearGradient>
      </defs>

      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

      <XAxis
        dataKey="matchIndex"
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
        labelFormatter={(_val: number, payload: { payload?: Record<string, unknown> }[]) => {
          const p = payload[0]?.payload;
          const d = p?.date as string | undefined;
          return d ? d.slice(0, 10) : '';
        }}
      />

      <Area type="monotone" dataKey="t1" fill="url(#cwT1Grad)" stroke="none" fillOpacity={1} />
      <Area type="monotone" dataKey="t2" fill="url(#cwT2Grad)" stroke="none" fillOpacity={1} />

      <Line
        type="monotone"
        dataKey="t1"
        stroke="#3b82f6"
        strokeWidth={1.5}
        dot={false}
        activeDot={{ r: 3 }}
      />
      <Line
        type="monotone"
        dataKey="t2"
        stroke="#ef4444"
        strokeWidth={1.5}
        dot={false}
        activeDot={{ r: 3 }}
      />
    </ComposedChart>
  );

  return (
    <div className="w-full" role="img" aria-label={`Cumulative wins: ${team1} vs ${team2}`}>
      {width != null ? (
        lineChart
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {lineChart}
        </ResponsiveContainer>
      )}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-1.5">
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
          <span
            className="inline-block rounded-sm"
            style={{ width: 14, height: 3, backgroundColor: '#3b82f6' }}
          />
          {team1}
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-600">
          <span
            className="inline-block rounded-sm"
            style={{ width: 14, height: 3, backgroundColor: '#ef4444' }}
          />
          {team2}
        </span>
      </div>
    </div>
  );
}
