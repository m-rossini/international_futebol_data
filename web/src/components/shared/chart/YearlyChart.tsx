"use client";

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BarDatum {
  year: number;
  wins: number;
  losses: number;
  draws: number;
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
  { dataKey: "wins" as const, color: "#22c55e", label: "Wins" },
  { dataKey: "draws" as const, color: "#f59e0b", label: "Draws" },
  { dataKey: "losses" as const, color: "#ef4444", label: "Losses" },
] as const;

// ---------------------------------------------------------------------------
// Custom dot shape
// ---------------------------------------------------------------------------

function DotShape(props: Record<string, unknown>) {
  const cx = props.cx as number | undefined;
  const cy = props.cy as number | undefined;
  const fill = props.fill as string | undefined;
  const r = (props.r as number) ?? 3;
  return <circle cx={cx} cy={cy} r={r} fill={fill} opacity={0.85} />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function YearlyChart({ data, height = 240, width }: Props) {
  const sorted = useMemo(
    () => [...data].sort((a, b) => a.year - b.year),
    [data],
  );

  if (data.length === 0) {
    return (
      <div className="text-center text-xs text-gray-400 py-2">
        No yearly data available
      </div>
    );
  }

  // Dot radius: larger for small datasets, smaller for dense ones
  const dotR =
    sorted.length <= 20 ? 4 : sorted.length <= 60 ? 3 : sorted.length <= 100 ? 2 : 1.5;

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

  const chart = (
    <ScatterChart
      width={width}
      height={height}
      margin={{ top: 8, right: 20, bottom: 20, left: 4 }}
    >
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

      <XAxis
        dataKey="year"
        type="number"
        domain={["dataMin", "dataMax"]}
        ticks={xTicks}
        interval={0}
        tick={{ fontSize: 10, fill: "#9ca3af" }}
        tickLine={false}
        axisLine={{ stroke: "#e5e7eb" }}
      />

      <YAxis
        tick={{ fontSize: 10, fill: "#9ca3af" }}
        tickLine={false}
        axisLine={{ stroke: "#e5e7eb" }}
        allowDecimals={false}
      />

      <Tooltip
        contentStyle={{ fontSize: 11, borderRadius: 6 }}
        formatter={(value: number) => [value, undefined]}
        labelFormatter={(year: number) => `Year: ${year}`}
      />

      <Legend
        wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        iconType="circle"
        iconSize={10}
        verticalAlign="bottom"
      />

      {SERIES.map((s) => (
        <Scatter
          key={s.dataKey}
          data={sorted}
          dataKey={s.dataKey}
          fill={s.color}
          name={s.label}
          shape={<DotShape r={dotR} />}
        />
      ))}
    </ScatterChart>
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
