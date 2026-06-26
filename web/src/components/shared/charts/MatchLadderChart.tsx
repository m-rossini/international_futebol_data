"use client";

import { useMemo } from "react";
import type { MatchItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  matches: MatchItem[];
  team: string;
  height?: number;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const CHART_W = 400;
const PAD_LEFT = 28;
const PAD_RIGHT = 32;
const PAD_BOTTOM = 16;
const PAD_TOP = 8;

const LINE_COLOR = "#22c55e";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function yearFromDate(raw: string): number {
  return parseInt(raw.slice(0, 4), 10);
}

function matchResult(m: MatchItem, team: string): 1 | 0 | -1 {
  const isHome = m.home_team === team;
  const gf = isHome ? m.home_score : m.away_score;
  const ga = isHome ? m.away_score : m.home_score;
  if (gf > ga) return 1;
  if (gf < ga) return -1;
  return 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const MAX_BUCKETS = 40;

export function MatchLadderChart({ matches, team, height = 120 }: Props) {
  // --- derived data (all hooks at top level, before any early return) ---

  const { points, yRange, years } = useMemo(() => {
    if (matches.length === 0) {
      return {
        points: [] as [number, number][],
        yRange: [-1, 1] as [number, number],
        years: [] as number[],
      };
    }

    const sorted = [...matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    // Aggregate by year: sum W/D/L net per year
    const yearMap = new Map<number, number>();
    for (const m of sorted) {
      const y = yearFromDate(m.date);
      yearMap.set(y, (yearMap.get(y) ?? 0) + matchResult(m, team));
    }

    // Sort years and compute cumulative net, building one point per year
    const allYears = [...yearMap.keys()].sort((a, b) => a - b);

    // If too many years, merge into ~MAX_BUCKETS groups
    let groupSize = 1;
    if (allYears.length > MAX_BUCKETS) {
      groupSize = Math.ceil(allYears.length / MAX_BUCKETS);
    }

    let net = 0;
    let min = 0;
    let max = 0;
    const pts: [number, number][] = [];
    const yrs: number[] = [];

    for (let g = 0; g < allYears.length; g += groupSize) {
      const groupEnd = Math.min(g + groupSize, allYears.length);
      let groupNet = 0;
      for (let j = g; j < groupEnd; j++) {
        groupNet += yearMap.get(allYears[j]) ?? 0;
      }
      net += groupNet;
      pts.push([g, net]); // x = group index (spans full width)
      yrs.push(allYears[groupEnd - 1]); // label = last year in group
      if (net < min) min = net;
      if (net > max) max = net;
    }

    const absMax = Math.max(Math.abs(min), Math.abs(max), 1);
    return {
      points: pts,
      yRange: [-absMax, absMax] as [number, number],
      years: yrs,
    };
  }, [matches, team]);

  const totalW = PAD_LEFT + CHART_W + PAD_RIGHT;
  const chartH = height - PAD_TOP - PAD_BOTTOM;
  const lastIdx = Math.max(points.length - 1, 1);
  const [yMin, yMax] = yRange;
  const ySpan = yMax - yMin || 1;

  // Scale functions (memoized for stable dependencies)
  const xScale = useMemo(
    () => (i: number) => PAD_LEFT + (i / lastIdx) * CHART_W,
    [lastIdx],
  );
  const yScale = useMemo(
    () => (v: number) => PAD_TOP + chartH - ((v - yMin) / ySpan) * chartH,
    [chartH, yMin, ySpan],
  );
  const zeroY = yScale(0);

  // Step path: horizontal to next x, then vertical to new y
  const stepPath = useMemo(() => {
    if (points.length === 0) return "";
    let d = `M${xScale(0)},${yScale(points[0][1])}`;
    for (let i = 1; i < points.length; i++) {
      const currX = xScale(i);
      const prevY = yScale(points[i - 1][1]);
      const currY = yScale(points[i][1]);
      d += ` L${currX},${prevY} L${currX},${currY}`;
    }
    return d;
  }, [points, xScale, yScale]);

  // Area fill (to baseline)
  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    let d = stepPath;
    const lastX = xScale(points.length - 1);
    d += ` L${lastX},${zeroY} L${xScale(0)},${zeroY} Z`;
    return d;
  }, [stepPath, xScale, zeroY, points.length]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let v = yMin; v <= yMax; v++) ticks.push(v);
    if (ticks.length > 9) {
      const step = Math.ceil(ticks.length / 6);
      return ticks.filter((_, i) => i % step === 0 || ticks[i] === 0);
    }
    return ticks;
  }, [yMin, yMax]);

  // X-axis year labels
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

  // --- early return (after ALL hooks) ---

  if (matches.length < 2) {
    return (
      <div className="text-center text-xs text-gray-400 py-2">
        Need at least 2 matches to show a ladder
      </div>
    );
  }

  // --- render ---

  const lastP = points[points.length - 1];
  const lastY = lastP ? yScale(lastP[1]) : 0;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${height}`}
      className="w-full"
      role="img"
      aria-label={`Match-by-match W/D/L ladder for ${team}`}
    >
      {/* Gradient */}
      <defs>
        <linearGradient id="ladderGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={LINE_COLOR} />
          <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Zero baseline (dashed) */}
      <line
        x1={PAD_LEFT}
        x2={PAD_LEFT + CHART_W}
        y1={zeroY}
        y2={zeroY}
        stroke="#d1d5db"
        strokeWidth={1}
        strokeDasharray="4 3"
      />

      {/* Y-axis grid + labels */}
      {yTicks.map((tick) => (
        <g key={tick}>
          <line
            x1={PAD_LEFT}
            x2={PAD_LEFT + CHART_W}
            y1={yScale(tick)}
            y2={yScale(tick)}
            stroke={tick === 0 ? "#d1d5db" : "#f3f4f6"}
            strokeWidth={tick === 0 ? 1 : 0.5}
          />
          {tick === 0 ? null : (
            <text
              x={PAD_LEFT - 4}
              y={yScale(tick) + 3}
              textAnchor="end"
              fontSize={8}
              fill="#9ca3af"
            >
              {tick > 0 ? `+${tick}` : tick}
            </text>
          )}
        </g>
      ))}

      {/* Area fill */}
      <path d={areaPath} fill="url(#ladderGrad)" opacity={0.15} />

      {/* Step line */}
      <path
        d={stepPath}
        fill="none"
        stroke={LINE_COLOR}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Endpoint dot + label */}
      {lastP && (
        <g>
          <circle cx={xScale(lastP[0])} cy={lastY} r={2.5} fill={LINE_COLOR} />
          <text
            x={xScale(lastP[0]) + 5}
            y={lastY - 2}
            textAnchor="start"
            fontSize={8}
            fill={LINE_COLOR}
            fontWeight={600}
          >
            {lastP[1] > 0 ? `+${lastP[1]}` : lastP[1]}
          </text>
        </g>
      )}

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
      <g transform={`translate(${PAD_LEFT + 4}, ${PAD_TOP - 2})`}>
        <line x1={0} y1={3} x2={14} y2={3} stroke={LINE_COLOR} strokeWidth={2} />
        <text x={18} y={6} fontSize={9} fill="#6b7280">
          W/D/L Net
        </text>
      </g>
    </svg>
  );
}
