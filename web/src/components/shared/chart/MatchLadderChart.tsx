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
  ReferenceLine,
} from 'recharts';
import type { MatchItem } from '@/lib/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  matches: MatchItem[];
  team: string;
  height?: number;
  /** Explicit pixel width (bypasses ResponsiveContainer — useful for tests). */
  width?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LINE_COLOR = '#22c55e';
const MAX_BUCKETS = 40;

function matchResult(m: MatchItem, team: string): 1 | 0 | -1 {
  const isHome = m.home_team === team;
  const gf = isHome ? m.home_score : m.away_score;
  const ga = isHome ? m.away_score : m.home_score;
  if (gf > ga) return 1;
  if (gf < ga) return -1;
  return 0;
}

function shortDate(raw: string): string {
  return raw.slice(0, 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MatchLadderChart({ matches, team, height = 240, width }: Props) {
  const chartData = useMemo(() => {
    if (matches.length === 0) return [] as { bucketIndex: number; net: number; label: string }[];

    const sorted = [...matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Group matches into sequential buckets (max 40 buckets)
    const bucketSize = Math.max(1, Math.ceil(sorted.length / MAX_BUCKETS));

    let net = 0;
    const rows: { bucketIndex: number; net: number; label: string }[] = [];

    for (let bi = 0; bi < sorted.length; bi += bucketSize) {
      const end = Math.min(bi + bucketSize, sorted.length);
      let bucketNet = 0;
      for (let j = bi; j < end; j++) {
        bucketNet += matchResult(sorted[j], team);
      }
      net += bucketNet;

      const fromDate = shortDate(sorted[bi].date);
      const toDate = shortDate(sorted[end - 1].date);
      const label = bi === end - 1 ? fromDate : `${fromDate} — ${toDate}`;
      rows.push({ bucketIndex: bi, net, label });
    }

    return rows;
  }, [matches, team]);

  if (matches.length < 2) {
    return (
      <div className="text-center text-xs text-gray-400 py-2">
        Need at least 2 matches to show a ladder
      </div>
    );
  }

  const lineChart = (
    <ComposedChart
      width={width}
      height={height}
      data={chartData}
      margin={{ top: 8, right: 20, bottom: 8, left: 4 }}
    >
      <defs>
        <linearGradient id="ladderGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={LINE_COLOR} />
          <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
        </linearGradient>
      </defs>

      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

      <ReferenceLine y={0} stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 3" />

      <XAxis
        dataKey="bucketIndex"
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
        tickFormatter={(v: number) => (v > 0 ? `+${v}` : String(v))}
      />

      <Tooltip
        contentStyle={{ fontSize: 11, borderRadius: 6 }}
        labelFormatter={(_val: number, payload: { payload?: Record<string, unknown> }[]) => {
          const p = payload[0]?.payload;
          return (p?.label as string) ?? '';
        }}
        formatter={(value: number) => [value > 0 ? `+${value}` : value, 'Net']}
      />

      <Area type="stepAfter" dataKey="net" fill="url(#ladderGrad)" stroke="none" fillOpacity={1} />

      <Line
        type="stepAfter"
        dataKey="net"
        stroke={LINE_COLOR}
        strokeWidth={1.5}
        dot={false}
        activeDot={{ r: 3 }}
      />
    </ComposedChart>
  );

  return (
    <div className="w-full" role="img" aria-label={`Match-by-match W/D/L ladder for ${team}`}>
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
            style={{ width: 14, height: 3, backgroundColor: LINE_COLOR }}
          />
          W/D/L Net
        </span>
      </div>
    </div>
  );
}
