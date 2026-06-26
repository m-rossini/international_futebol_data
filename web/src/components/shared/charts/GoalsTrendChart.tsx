"use client";

import { useMemo } from "react";
import type { MatchItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TrendPoint {
  matchIndex: number;
  avgGoals: number;
  label?: string;
}

interface Props {
  matches: MatchItem[];
  windowSize?: number;
  height?: number;
  tickCount?: number;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const CHART_W = 400;
const PAD_LEFT = 32;
const PAD_RIGHT = 12;
const PAD_BOTTOM = 20;
const PAD_TOP = 8;

const LINE_COLOR = "#8b5cf6";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function yearLabel(dateStr: string): string {
  const d = new Date(dateStr.slice(0, 10) + "T00:00:00");
  return String(d.getFullYear());
}

function svgPoint(
  matchIdx: number,
  avgGoals: number,
  maxIdx: number,
  maxGoals: number,
  chartH: number,
) {
  return {
    x: PAD_LEFT + (matchIdx / Math.max(maxIdx, 1)) * CHART_W,
    y: PAD_TOP + chartH - (avgGoals / Math.max(maxGoals, 1)) * chartH,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GoalsTrendChart({
  matches,
  windowSize = 5,
  height = 150,
  tickCount = 6,
}: Props) {
  const points = useMemo<TrendPoint[]>(() => {
    const sorted = [...matches].sort(
      (a, b) =>
        new Date(a.date.slice(0, 10) + "T00:00:00").getTime() -
        new Date(b.date.slice(0, 10) + "T00:00:00").getTime(),
    );

    const result: TrendPoint[] = [];
    for (let i = 0; i < sorted.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const count = i - start + 1;
      let sum = 0;
      for (let j = start; j <= i; j++) {
        sum += sorted[j].home_score + sorted[j].away_score;
      }
      result.push({
        matchIndex: i,
        avgGoals: sum / count,
        label: yearLabel(sorted[i].date),
      });
    }
    return result;
  }, [matches, windowSize]);

  const chartH = height - PAD_TOP - PAD_BOTTOM;

  const maxGoals = useMemo(
    () => Math.max(...points.map((p) => p.avgGoals), 1),
    [points],
  );
  const maxIdx = Math.max(points.length - 1, 1);

  const totalW = PAD_LEFT + CHART_W + PAD_RIGHT;

  const ticks = useMemo(() => {
    if (points.length === 0) return [];
    const step = Math.max(1, Math.floor(points.length / (tickCount - 1)));
    return points.filter((_, i) => i % step === 0 || i === points.length - 1);
  }, [points, tickCount]);

  if (points.length < windowSize) {
    return (
      <div className="text-center text-xs text-gray-400 py-4">
        Not enough matches for trend (need at least {windowSize})
      </div>
    );
  }

  const pathD = points
    .map((p, i) => {
      const pt = svgPoint(p.matchIndex, p.avgGoals, maxIdx, maxGoals, chartH);
      return `${i === 0 ? "M" : "L"}${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${height}`}
        className="w-full"
        role="img"
        aria-label="Rolling average goals per match over time"
      >
        {/* Y-axis grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD_TOP + chartH - chartH * frac;
          return (
            <g key={frac}>
              <line
                x1={PAD_LEFT}
                x2={PAD_LEFT + CHART_W}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
              />
              <text
                x={PAD_LEFT - 6}
                y={y + 4}
                textAnchor="end"
                fontSize={11}
                fill="#9ca3af"
              >
                {(maxGoals * frac).toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {points.length > 0 && (() => {
          const first = svgPoint(points[0].matchIndex, points[0].avgGoals, maxIdx, maxGoals, chartH);
          const last = svgPoint(points[points.length - 1].matchIndex, points[points.length - 1].avgGoals, maxIdx, maxGoals, chartH);
          const baseY = PAD_TOP + chartH;
          const areaD = `${pathD} L${last.x.toFixed(1)} ${baseY} L${first.x.toFixed(1)} ${baseY} Z`;
          return <path d={areaD} fill="url(#goalFill)" opacity={0.15} />;
        })()}

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={LINE_COLOR}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Last point dot + label */}
        {points.length > 0 && (() => {
          const last = svgPoint(
            points[points.length - 1].matchIndex,
            points[points.length - 1].avgGoals,
            maxIdx, maxGoals, chartH,
          );
          return (
            <>
              <circle cx={last.x} cy={last.y} r={3} fill={LINE_COLOR} />
              <text
                x={last.x + 5}
                y={last.y + 4}
                fontSize={11}
                fontWeight={600}
                fill={LINE_COLOR}
              >
                {points[points.length - 1].avgGoals.toFixed(1)}
              </text>
            </>
          );
        })()}

        {/* Gradient */}
        <defs>
          <linearGradient id="goalFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={0.3} />
            <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        {/* X-axis ticks */}
        {ticks.map((tick) => {
          const pt = svgPoint(tick.matchIndex, 0, maxIdx, maxGoals, chartH);
          return (
            <text
              key={tick.matchIndex}
              x={pt.x}
              y={height - 6}
              textAnchor="middle"
              fontSize={10}
              fill="#9ca3af"
            >
              {tick.label}
            </text>
          );
        })}

        {/* X-axis label */}
        <text
          x={totalW / 2}
          y={height - 18}
          textAnchor="middle"
          fontSize={10}
          fill="#9ca3af"
        >
          Roll. avg ({windowSize}-match window)
        </text>
      </svg>
    </div>
  );
}
