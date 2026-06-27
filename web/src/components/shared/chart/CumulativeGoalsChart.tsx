"use client";

import { useMemo } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoalTracker {
  team: string;
  color: string;
  label?: string;
  against?: boolean;
}

interface Match {
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
}

interface Props {
  matches: Match[];
  track: GoalTracker[];
  height?: number;
  /** Explicit pixel width (bypasses ResponsiveContainer — useful for tests). */
  width?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function yearFromDate(raw: string): number {
  return parseInt(raw.slice(0, 4), 10);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CumulativeGoalsChart({
  matches,
  track,
  height = 240,
  width,
}: Props) {
  // Transform matches into chart data array
  const chartData = useMemo(() => {
    if (matches.length === 0 || track.length === 0) return [];

    const sorted = [...matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Thin out data when there are many matches (max 200 points)
    const step = Math.max(1, Math.floor(sorted.length / 200));
    const sampled = step > 1 ? sorted.filter((_, i) => i % step === 0) : sorted;

    const cum: number[] = track.map(() => 0);
    const rows: Record<string, number | string>[] = [];

    for (let mi = 0; mi < sampled.length; mi++) {
      const m = sampled[mi];
      for (let s = 0; s < track.length; s++) {
        const t = track[s];
        const isHome = m.home_team === t.team;
        const isAway = m.away_team === t.team;
        const goals = t.against
          ? isHome ? m.away_score : isAway ? m.home_score : 0
          : isHome ? m.home_score : isAway ? m.away_score : 0;
        cum[s] += goals;
      }

      rows.push({
        matchIndex: mi,
        year: yearFromDate(m.date),
        date: m.date,
        ...Object.fromEntries(track.map((_, i) => [`cum${i}`, cum[i]])),
      });
    }

    return rows;
  }, [matches, track]);

  if (matches.length === 0) {
    return (
      <div className="text-center text-xs text-gray-400 py-2">
        No match data available
      </div>
    );
  }

  const ariaLabel = `Cumulative goals: ${track.map((t) => t.label ?? t.team).join(" vs ")}`;
  const lineChart = (
    <ComposedChart
      width={width}
      height={height}
      data={chartData}
      margin={{ top: 8, right: 20, bottom: 8, left: 4 }}
    >
      <defs>
        {track.map((t, i) => (
          <linearGradient
            key={i}
            id={`cg${i}-${t.team.replace(/\s+/g, "-")}`}
            x1="0" y1="0" x2="0" y2="1"
          >
            <stop offset="0%" stopColor={t.color} />
            <stop offset="100%" stopColor={t.color} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>

      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

      <XAxis
        dataKey="matchIndex"
        type="number"
        domain={["dataMin", "dataMax"]}
        tick={{ fontSize: 10, fill: "#9ca3af" }}
        tickLine={false}
        axisLine={{ stroke: "#e5e7eb" }}
        tickFormatter={() => ""}
      />

      <YAxis
        tick={{ fontSize: 10, fill: "#9ca3af" }}
        tickLine={false}
        axisLine={{ stroke: "#e5e7eb" }}
        allowDecimals={false}
      />

      <Tooltip
        contentStyle={{ fontSize: 11, borderRadius: 6 }}
        labelFormatter={(_val: number, payload: { payload: Record<string, unknown> }[]) => {
          const p = payload[0]?.payload;
          const d = p?.date as string | undefined;
          const y = p?.year as number | undefined;
          return d ? d.slice(0, 10) : `Year: ${y ?? "?"}`;
        }}
      />

      {track.map((t, i) => (
        <Area
          key={`area-${i}`}
          type="monotone"
          dataKey={`cum${i}`}
          fill={`url(#cg${i}-${t.team.replace(/\s+/g, "-")})`}
          stroke="none"
          fillOpacity={1}
        />
      ))}

      {track.map((t, i) => (
        <Line
          key={`line-${i}`}
          type="monotone"
          dataKey={`cum${i}`}
          stroke={t.color}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
        />
      ))}
    </ComposedChart>
  );

  return (
    <div className="w-full" role="img" aria-label={ariaLabel}>
      {width != null ? (
        lineChart
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          {lineChart}
        </ResponsiveContainer>
      )}
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-1.5">
        {track.map((t, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
            <span
              className="inline-block rounded-sm"
              style={{ width: 14, height: 3, backgroundColor: t.color }}
            />
            {t.label ?? t.team}
          </span>
        ))}
      </div>
    </div>
  );
}
