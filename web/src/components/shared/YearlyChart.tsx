"use client";

import { useMemo } from "react";

interface BarDatum {
  year: number;
  wins: number;
  losses: number;
  draws: number;
}

interface Props {
  data: BarDatum[];
  height?: number;
}

const BAR_W = 40;
const GAP = 10;
const PAD_LEFT = 32;
const PAD_BOTTOM = 16;
const PAD_TOP = 6;

const COLORS = {
  wins: "#22c55e",
  draws: "#f59e0b",
  losses: "#ef4444",
} as const;

export function YearlyChart({ data, height = 180 }: Props) {
  const sorted = useMemo(() => [...data].sort((a, b) => a.year - b.year), [data]);
  const maxVal = useMemo(
    () => Math.max(...data.map((d) => d.wins + d.losses + d.draws), 1),
    [data],
  );

  const chartH = height - PAD_TOP - PAD_BOTTOM;
  const totalW = Math.max(
    PAD_LEFT + sorted.length * (BAR_W + GAP) + GAP,
    200, // minimum width so single-bar charts don't look pencil-thin
  );

  if (data.length === 0) {
    return (
      <div className="text-center text-xs text-gray-400 py-4">
        No yearly data available
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mb-2">
        {(["wins", "draws", "losses"] as const).map((key) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: COLORS[key] }}
            />
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${totalW} ${height}`}
        className="w-full"
        role="img"
        aria-label="Wins / Losses / Draws per year"
      >
        {/* Y-axis grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = PAD_TOP + chartH - chartH * frac;
          const val = Math.round(maxVal * frac);
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
                {val}
              </text>
            </g>
          );
        })}

        {/* Stacked bars */}
        {sorted.map((d, i) => {
          const x = PAD_LEFT + i * (BAR_W + GAP) + GAP / 2;
          const total = d.wins + d.losses + d.draws;

          const lossesH = (d.losses / maxVal) * chartH;
          const drawsH = (d.draws / maxVal) * chartH;
          const winsH = (d.wins / maxVal) * chartH;
          const totalH = lossesH + drawsH + winsH;

          const baseY = PAD_TOP + chartH;
          const lossesY = baseY - lossesH;
          const drawsY = lossesY - drawsH;
          const winsY = drawsY - winsH;

          return (
            <g key={d.year}>
              {/* Losses (bottom) */}
              {d.losses > 0 && (
                <rect
                  x={x}
                  y={lossesY}
                  width={BAR_W}
                  height={lossesH}
                  fill={COLORS.losses}
                />
              )}
              {/* Draws (middle) */}
              {d.draws > 0 && (
                <rect
                  x={x}
                  y={drawsY}
                  width={BAR_W}
                  height={drawsH}
                  fill={COLORS.draws}
                />
              )}
              {/* Wins (top) */}
              {d.wins > 0 && (
                <rect
                  x={x}
                  y={winsY}
                  width={BAR_W}
                  height={winsH}
                  fill={COLORS.wins}
                  rx={3}
                />
              )}

              {/* Total value label on top */}
              <text
                x={x + BAR_W / 2}
                y={baseY - totalH - 4}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {total}
              </text>
              {/* Year label below */}
              <text
                x={x + BAR_W / 2}
                y={height - 4}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {d.year}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
