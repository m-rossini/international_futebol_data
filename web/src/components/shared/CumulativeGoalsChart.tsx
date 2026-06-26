"use client";

import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GoalTracker {
  /** Team name to track cumulative goals for */
  team: string;
  /** Display color for the line / fill */
  color: string;
  /** Optional override label (defaults to team name) */
  label?: string;
}

interface Match {
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
}

interface Props {
  /** Match list (will be sorted by date internally) */
  matches: Match[];
  /** Which team(s) to track cumulative goals for. 1 for single-team mode, 2 for H2H. */
  track: GoalTracker[];
  height?: number;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const CHART_W = 400;
const PAD_LEFT = 28;
const PAD_RIGHT = 32;
const PAD_BOTTOM = 16;
const PAD_TOP = 6;

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
  height = 90,
}: Props) {
  // Compute cumulative goals for each tracked team + x-axis label data
  const chartData = useMemo(() => {
    if (matches.length === 0 || track.length === 0) {
      return { series: [] as { values: number[]; maxVal: number }[], years: [] as number[], maxVal: 1 };
    }

    const sorted = [...matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    const cum: number[][] = track.map(() => []);
    const years: number[] = [];
    let globalMax = 1;

    for (const m of sorted) {
      years.push(yearFromDate(m.date));

      for (let s = 0; s < track.length; s++) {
        const t = track[s];
        const goals =
          m.home_team === t.team
            ? m.home_score
            : m.away_team === t.team
              ? m.away_score
              : 0;

        const prev = cum[s].length > 0 ? cum[s][cum[s].length - 1] : 0;
        const next = prev + goals;
        cum[s].push(next);
        if (next > globalMax) globalMax = next;
      }
    }

    const series = cum.map((values) => ({ values, maxVal: Math.max(...values, 1) }));
    return { series, years, maxVal: globalMax };
  }, [matches, track]);

  const { series, years, maxVal } = chartData;

  // X-axis year labels — show every ~20% of matches
  const xLabels = useMemo(() => {
    const labels: { idx: number; year: number }[] = [];
    const n = years.length;
    if (n <= 1) return labels;
    const step = Math.max(1, Math.floor(n / 5));
    for (let i = 0; i < n; i += step) {
      labels.push({ idx: i, year: years[i] });
    }
    const last = labels[labels.length - 1];
    if (!last || last.idx !== n - 1) {
      labels.push({ idx: n - 1, year: years[n - 1] });
    }
    return labels;
  }, [years]);

  if (matches.length === 0) {
    return (
      <div className="text-center text-xs text-gray-400 py-2">
        No match data available
      </div>
    );
  }

  const totalW = PAD_LEFT + CHART_W + PAD_RIGHT;
  const chartH = height - PAD_TOP - PAD_BOTTOM;
  const lastIdx = Math.max(series[0]?.values.length ?? 1, 1) - 1;

  const xScale = (i: number) => PAD_LEFT + (i / Math.max(lastIdx, 1)) * CHART_W;
  const yScale = (v: number) => PAD_TOP + chartH - (v / maxVal) * chartH;

  // Build SVG path for each series
  const lines = series.map((s) =>
    s.values.map((_, i) => `${xScale(i)},${yScale(s.values[i])}`).join(" "),
  );

  const areas = lines.map(
    (line) =>
      `${line} ${xScale(lastIdx)},${yScale(0)} ${PAD_LEFT},${yScale(0)}`,
  );

  // Generate unique gradient IDs (avoid clashes when multiple instances on page)
  const gradientIds = track.map(
    (_, i) => `cgGrad-${i}-${track[i]?.team.replace(/\s+/g, "-")}`,
  );

  return (
    <svg
      viewBox={`0 0 ${totalW} ${height}`}
      className="w-full"
      role="img"
      aria-label={`Cumulative goals: ${track.map((t) => t.label ?? t.team).join(" vs ")}`}
    >
      {/* Gradients */}
      <defs>
        {track.map((t, i) => (
          <linearGradient key={gradientIds[i]} id={gradientIds[i]} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={t.color} />
            <stop offset="100%" stopColor={t.color} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>

      {/* Grid lines + Y-axis labels */}
      {(() => {
        const step = Math.max(1, Math.ceil(maxVal / 4));
        const ticks: number[] = [];
        for (let i = 0; i <= maxVal; i += step) ticks.push(i);
        if (ticks[ticks.length - 1] !== maxVal) ticks.push(maxVal);
        return ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD_LEFT}
              x2={PAD_LEFT + CHART_W}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#e5e7eb"
              strokeWidth={0.5}
            />
            <text
              x={PAD_LEFT - 4}
              y={yScale(tick) + 3}
              textAnchor="end"
              fontSize={8}
              fill="#9ca3af"
            >
              {tick}
            </text>
          </g>
        ));
      })()}

      {/* Shaded areas */}
      {areas.map((area, i) => (
        <polygon
          key={i}
          points={area}
          fill={`url(#${gradientIds[i]})`}
          opacity={0.12}
        />
      ))}

      {/* Lines */}
      {lines.map((line, i) => (
        <polyline
          key={i}
          points={line}
          fill="none"
          stroke={track[i].color}
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
      ))}

      {/* Endpoint dots + labels */}
      {series.map((s, si) => {
        const lastV = s.values[s.values.length - 1];
        const lastX = xScale(s.values.length - 1);
        const lastY = yScale(lastV);
        // Stagger labels vertically so they don't overlap
        const yOff = si === 0 ? -2 : 9;
        return (
          <g key={si}>
            <circle cx={lastX} cy={lastY} r={2.5} fill={track[si].color} />
            <text
              x={lastX + 5}
              y={lastY + yOff}
              textAnchor="start"
              fontSize={8}
              fill={track[si].color}
              fontWeight={600}
            >
              {lastV}
            </text>
          </g>
        );
      })}

      {/* X-axis year labels */}
      {xLabels.map(({ idx, year }) => (
        <text
          key={idx}
          x={xScale(idx)}
          y={height - 2}
          textAnchor="middle"
          fontSize={8}
          fill="#9ca3af"
        >
          {year}
        </text>
      ))}

      {/* Legend */}
      <g transform={`translate(${PAD_LEFT + 4}, ${PAD_TOP})`}>
        {track.map((t, i) => {
          const offset = i * 80;
          return (
            <g key={i} transform={`translate(${offset}, 0)`}>
              <line x1={0} y1={3} x2={14} y2={3} stroke={t.color} strokeWidth={2} />
              <text x={18} y={6} fontSize={9} fill="#6b7280">
                {t.label ?? t.team}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
