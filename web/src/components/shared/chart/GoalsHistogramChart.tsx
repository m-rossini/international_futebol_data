'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  data: Record<string, number>;
  height?: number;
  /** Unit shown in the tooltip/aria-label (e.g. "goals", "matches"). */
  unit?: string;
}

export function GoalsHistogramChart({ data, height = 240, unit = 'goals' }: Props) {
  const chartData = useMemo(() => {
    return Object.entries(data)
      .map(([goals, count]) => ({ goals: Number(goals), count }))
      .sort((a, b) => a.goals - b.goals);
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="text-center text-xs text-gray-400 py-2">No histogram data available</div>
    );
  }

  return (
    <div className="w-full" role="img" aria-label={`${unit} per match histogram`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} margin={{ top: 8, right: 20, bottom: 20, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="goals"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 6 }}
            formatter={(value: number) => [
              value,
              unit === 'goals' ? 'Matches' : unit[0].toUpperCase() + unit.slice(1),
            ]}
            labelFormatter={(goals) => `${goals} ${unit}`}
          />
          <Bar
            dataKey="count"
            name={unit === 'goals' ? 'Matches' : unit}
            fill="#3b82f6"
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
