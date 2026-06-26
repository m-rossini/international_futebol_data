"use client";

import { useMemo } from "react";
import type { MatchItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Point {
  x: number;
  y: number;
}

interface LineDatum {
  matchIndex: number;
  team1CumWins: number;
  team2CumWins: number;
}

interface Props {
  matches: MatchItem[];
  team1: string;
  team2: string;
  height?: number;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_BOTTOM = 28;
const PAD_TOP = 14;

const COLORS = {
  team1: "#3b82f6", // blue
  team2: "#ef4444", // red
} as const;

/** Convert data coords to SVG coords */
function svgPoint(
  matchIdx: number,
  cumWins: number,
  maxMatches: number,
  maxWins: number,
  chartW: number,
  chartH: number,
): Point {
  return {
    x: PAD_LEFT + (matchIdx / Math.max(maxMatches - 1, 1)) * chartW,
    y: PAD_TOP + chartH - (cumWins / Math.max(maxWins, 1)) * chartH,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CumulativeWinsChart({
  matches,
  team1,
  team2,
  height = 220,
}: Props) {
  const lines = useMemo<LineDatum[]>(() => {
    const sorted = [...matches].sort(
      (a, b) =>
        new Date(a.date.slice(0, 10) + "T00:00:00").getTime() -
        new Date(b.date.slice(0, 10) + "T00:00:00").getTime(),
    );

    let t1 = 0;
    let t2 = 0;
    const result: LineDatum[] = [];

    for (const m of sorted) {
      if (m.home_score > m.away_score) {
        if (m.home_team === team1) t1++;
        else if (m.home_team === team2) t2++;
      } else if (m.home_score < m.away_score) {
        if (m.away_team === team1) t1++;
        else if (m.away_team === team2) t2++;
      }
      result.push({
        matchIndex: result.length,
        team1CumWins: t1,
        team2CumWins: t2,
      });
    }

    return result;
  }, [matches, team1, team2]);

  const chartH = height - PAD_TOP - PAD_BOTTOM;
  const chartW = 500; // fixed svg width for consistent line spacing

  const maxMatches = Math.max(lines.length - 1, 1);
  const maxWins = useMemo(
    () =>
      Math.max(
        ...lines.map((l) => Math.max(l.team1CumWins, l.team2CumWins)),
        1,
      ),
    [lines],
  );

  const totalW = PAD_LEFT + chartW + PAD_RIGHT;

  if (lines.length < 2) {
    return (
      <div className="text-center text-xs text-gray-400 py-4">
        Not enough matches for cumulative chart
      </div>
    );
  }

  const t1Path = lines
    .map((l, i) => {
      const p = svgPoint(l.matchIndex, l.team1CumWins, maxMatches, maxWins, chartW, chartH);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(" ");

  const t2Path = lines
    .map((l, i) => {
      const p = svgPoint(l.matchIndex, l.team2CumWins, maxMatches, maxWins, chartW, chartH);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mb-2">
        <LegendItem color={COLORS.team1} label={team1} />
        <LegendItem color={COLORS.team2} label={team2} />
      </div>

      <svg
        viewBox={`0 0 ${totalW} ${height}`}
        className="w-full min-w-[500px]"
        role="img"
        aria-label={`Cumulative wins: ${team1} vs ${team2}`}
      >
        {/* Y-axis grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD_TOP + chartH - chartH * frac;
          return (
            <g key={frac}>
              <line
                x1={PAD_LEFT}
                x2={totalW - PAD_RIGHT}
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
                {Math.round(maxWins * frac)}
              </text>
            </g>
          );
        })}

        {/* Team1 line */}
        <path
          d={t1Path}
          fill="none"
          stroke={COLORS.team1}
          strokeWidth={2}
          strokeLinejoin="round"
        />
        {/* Team2 line */}
        <path
          d={t2Path}
          fill="none"
          stroke={COLORS.team2}
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {/* Last point labels */}
        {lines.length > 0 && (() => {
          const last = lines[lines.length - 1];
          const p1 = svgPoint(last.matchIndex, last.team1CumWins, maxMatches, maxWins, chartW, chartH);
          const p2 = svgPoint(last.matchIndex, last.team2CumWins, maxMatches, maxWins, chartW, chartH);
          return (
            <>
              <text
                x={p1.x + 4}
                y={p1.y + 4}
                fontSize={11}
                fontWeight={600}
                fill={COLORS.team1}
              >
                {last.team1CumWins}
              </text>
              <text
                x={p2.x + 4}
                y={p2.y + 4}
                fontSize={11}
                fontWeight={600}
                fill={COLORS.team2}
              >
                {last.team2CumWins}
              </text>
            </>
          );
        })()}

        {/* X-axis label */}
        <text
          x={totalW / 2}
          y={height - 4}
          textAnchor="middle"
          fontSize={10}
          fill="#9ca3af"
        >
          Matches (chronological)
        </text>
      </svg>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <span
        className="inline-block w-4 h-0.5 rounded"
        style={{ backgroundColor: color }}
      />
      {label}
    </div>
  );
}
