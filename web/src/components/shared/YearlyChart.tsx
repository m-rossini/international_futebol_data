"use client";

import { useMemo } from "react";

interface BarDatum {
  year: number;
  value: number;
}

interface Props {
  data: BarDatum[];
  height?: number;
}

const BAR_W = 36;
const GAP = 12;
const PAD_LEFT = 40;
const PAD_BOTTOM = 24;
const PAD_TOP = 10;

export function YearlyChart({ data, height = 180 }: Props) {
  const sorted = useMemo(() => [...data].sort((a, b) => a.year - b.year), [data]);
  const maxVal = useMemo(() => Math.max(...data.map((d) => d.value), 1), [data]);

  const chartH = height - PAD_TOP - PAD_BOTTOM;
  const totalW = PAD_LEFT + sorted.length * (BAR_W + GAP) + GAP;

  if (data.length === 0) {
    return (
      <div className="text-center text-xs text-gray-400 py-4">
        No yearly data available
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${height}`}
        className="w-full min-w-[400px]"
        role="img"
        aria-label="Matches per year"
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

        {/* Bars */}
        {sorted.map((d, i) => {
          const x = PAD_LEFT + i * (BAR_W + GAP) + GAP / 2;
          const barH = (d.value / maxVal) * chartH;
          const y = PAD_TOP + chartH - barH;

          return (
            <g key={d.year}>
              <rect
                x={x}
                y={y}
                width={BAR_W}
                height={barH}
                fill="#3b82f6"
                rx={3}
              />
              {/* Value label on top */}
              <text
                x={x + BAR_W / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {d.value}
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
