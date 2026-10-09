'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface AvgGoalsPoint {
  idx: number;
  date: string;
  avgGoals: number;
}

interface Props {
  data: AvgGoalsPoint[];
  height?: number;
}

/**
 * Running average goals-per-match across a season, drawn as a staircase.
 *
 * The line holds its value until the next match is played, then steps up or
 * down -- so the shape reads as a ladder rather than a smooth trend.
 */
export function AvgGoalsLadderChart({ data, height = 240 }: Props) {
  if (data.length === 0) {
    return <div className="text-center text-xs text-gray-400 py-2">No match data available</div>;
  }

  return (
    <div className="w-full" role="img" aria-label="Average goals per match across the season">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 20, bottom: 8, left: 4 }}>
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
            domain={['auto', 'auto']}
            allowDecimals
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
            formatter={(value: number) => [value.toFixed(2), 'Avg goals']}
            labelFormatter={(_val, payload) => {
              const p = payload?.[0]?.payload as AvgGoalsPoint | undefined;
              return p?.date ?? '';
            }}
          />
          <Line
            type="stepAfter"
            dataKey="avgGoals"
            stroke="#f59e0b"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
