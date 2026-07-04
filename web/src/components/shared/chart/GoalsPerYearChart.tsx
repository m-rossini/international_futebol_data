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

interface GoalDatum {
  year: number;
  goals: number;
  avg_goals: number;
}

interface Props {
  data: GoalDatum[];
  height?: number;
}

export function GoalsPerYearChart({ data, height = 240 }: Props) {
  const sorted = useMemo(() => [...data].sort((a, b) => a.year - b.year), [data]);

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

  const margin = { top: 8, right: 40, bottom: 20, left: 4 };

  return (
    <div className="w-full" role="img" aria-label="Goals per year">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart data={sorted} margin={margin}>
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
            yAxisId="total"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="avg"
            orientation="right"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
            formatter={(value: number, name: string) => [
              value,
              name === 'goals' ? 'Total Goals' : 'Avg Goals/Match',
            ]}
            labelFormatter={(year: number) => `Year: ${year}`}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            iconType="circle"
            iconSize={10}
            verticalAlign="bottom"
          />
          <Bar
            yAxisId="total"
            dataKey="goals"
            name="Total Goals"
            fill="#3b82f6"
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="avg"
            type="monotone"
            dataKey="avg_goals"
            name="Avg Goals/Match"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
