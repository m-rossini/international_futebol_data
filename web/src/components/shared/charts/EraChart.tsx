"use client";

import { useMemo } from "react";
import type { MatchItem } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EraDatum {
  era: string;
  decade: number;
  team1Wins: number;
  draws: number;
  team2Wins: number;
  total: number;
}

interface Props {
  matches: MatchItem[];
  team1: string;
  team2: string;
  height?: number;
  minMatches?: number;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const BAR_W = 32;
const GAP = 10;
const PAD_LEFT = 40;
const PAD_BOTTOM = 24;
const PAD_TOP = 10;

const COLORS = {
  team1: "#22c55e",
  draws: "#f59e0b",
  team2: "#ef4444",
} as const;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function EraChart({
  matches,
  team1,
  team2,
  height = 150,
  minMatches = 1,
}: Props) {
  const eras = useMemo<EraDatum[]>(() => {
    const map = new Map<number, EraDatum>();

    for (const m of matches) {
      const d = new Date(m.date.slice(0, 10) + "T00:00:00");
      const decade = Math.floor(d.getFullYear() / 10) * 10;

      let entry = map.get(decade);
      if (!entry) {
        entry = {
          era: `${decade}s`,
          decade,
          team1Wins: 0,
          draws: 0,
          team2Wins: 0,
          total: 0,
        };
        map.set(decade, entry);
      }

      entry.total++;
      if (m.home_score > m.away_score) {
        if (m.home_team === team1) entry.team1Wins++;
        else if (m.home_team === team2) entry.team2Wins++;
        else entry.draws++;
      } else if (m.home_score < m.away_score) {
        if (m.away_team === team1) entry.team1Wins++;
        else if (m.away_team === team2) entry.team2Wins++;
        else entry.draws++;
      } else {
        entry.draws++;
      }
    }

    return [...map.values()]
      .filter((e) => e.total >= minMatches)
      .sort((a, b) => a.decade - b.decade);
  }, [matches, team1, team2, minMatches]);

  const maxVal = useMemo(
    () => Math.max(...eras.map((e) => e.total), 1),
    [eras],
  );

  const chartH = height - PAD_TOP - PAD_BOTTOM;
  const totalW = PAD_LEFT + eras.length * (BAR_W + GAP) + GAP;

  if (eras.length === 0) {
    return (
      <div className="text-center text-xs text-gray-400 py-4">
        Not enough data for era breakdown
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mb-1 flex-wrap">
        <LegendItem color={COLORS.team1} label={`${team1} Wins`} />
        <LegendItem color={COLORS.draws} label="Draws" />
        <LegendItem color={COLORS.team2} label={`${team2} Wins`} />
      </div>

      <svg
        viewBox={`0 0 ${totalW} ${height}`}
        className="w-full max-w-[600px]"
        role="img"
        aria-label={`Head-to-head era breakdown: ${team1} vs ${team2}`}
      >
        {/* Y-axis grid */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD_TOP + chartH - chartH * frac;
          return (
            <g key={frac}>
              <line
                x1={PAD_LEFT}
                x2={totalW}
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
                {Math.round(maxVal * frac)}
              </text>
            </g>
          );
        })}

        {/* Stacked bars */}
        {eras.map((e, i) => {
          const x = PAD_LEFT + i * (BAR_W + GAP) + GAP / 2;

          const t2H = (e.team2Wins / maxVal) * chartH;
          const drawsH = (e.draws / maxVal) * chartH;
          const t1H = (e.team1Wins / maxVal) * chartH;

          const baseY = PAD_TOP + chartH;
          const t2Y = baseY - t2H;
          const drawsY = t2Y - drawsH;
          const t1Y = drawsY - t1H;

          return (
            <g key={e.decade}>
              {e.team2Wins > 0 && (
                <rect
                  x={x}
                  y={t2Y}
                  width={BAR_W}
                  height={t2H}
                  fill={COLORS.team2}
                />
              )}
              {e.draws > 0 && (
                <rect
                  x={x}
                  y={drawsY}
                  width={BAR_W}
                  height={drawsH}
                  fill={COLORS.draws}
                />
              )}
              {e.team1Wins > 0 && (
                <rect
                  x={x}
                  y={t1Y}
                  width={BAR_W}
                  height={t1H}
                  fill={COLORS.team1}
                  rx={3}
                />
              )}

              <text
                x={x + BAR_W / 2}
                y={t1Y - 4}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {e.total}
              </text>
              <text
                x={x + BAR_W / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {e.era}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-500">
      <span
        className="inline-block w-3 h-3 rounded-sm"
        style={{ backgroundColor: color }}
      />
      {label}
    </div>
  );
}
