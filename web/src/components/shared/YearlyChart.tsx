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

const CHART_W = 400;
const PAD_LEFT = 28;
const PAD_RIGHT = 32;
const PAD_BOTTOM = 16;
const PAD_TOP = 8;
const TOTAL_W = PAD_LEFT + CHART_W + PAD_RIGHT;

const SERIES = [
  { key: "wins" as const, color: "#22c55e", label: "Wins" },
  { key: "draws" as const, color: "#f59e0b", label: "Draws" },
  { key: "losses" as const, color: "#ef4444", label: "Losses" },
] as const;

export function YearlyChart({ data, height = 120 }: Props) {
  const sorted = useMemo(() => [...data].sort((a, b) => a.year - b.year), [data]);

  const maxVal = useMemo(
    () => Math.max(...data.map((d) => Math.max(d.wins, d.draws, d.losses)), 1),
    [data],
  );

  const chartH = height - PAD_TOP - PAD_BOTTOM;
  const lastIdx = Math.max(sorted.length - 1, 1);

  // X / Y scale (memoized)
  const xScale = useMemo(
    () => (i: number) => PAD_LEFT + (i / lastIdx) * CHART_W,
    [lastIdx],
  );
  const yScale = useMemo(
    () => (v: number) => PAD_TOP + chartH - (v / maxVal) * chartH,
    [chartH, maxVal],
  );

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const step = Math.max(1, Math.ceil(maxVal / 4));
    const ticks: number[] = [];
    for (let i = 0; i <= maxVal; i += step) ticks.push(i);
    if (ticks[ticks.length - 1] !== maxVal) ticks.push(maxVal);
    return ticks;
  }, [maxVal]);

  // X-axis year labels
  const xLabels = useMemo(() => {
    const labels: { idx: number; year: number }[] = [];
    if (sorted.length <= 1) return labels;
    const step = Math.max(1, Math.floor(sorted.length / 5));
    for (let i = 0; i < sorted.length; i += step) {
      labels.push({ idx: i, year: sorted[i].year });
    }
    const last = labels[labels.length - 1];
    if (!last || last.idx !== sorted.length - 1) {
      labels.push({ idx: sorted.length - 1, year: sorted[sorted.length - 1].year });
    }
    return labels;
  }, [sorted]);

  if (data.length === 0) {
    return (
      <div className="text-center text-xs text-gray-400 py-2">
        No yearly data available
      </div>
    );
  }

  // Dot radius: larger for small datasets, smaller for dense ones
  const dotR = sorted.length <= 20 ? 3.5 : sorted.length <= 60 ? 2.5 : sorted.length <= 100 ? 1.5 : 1.0;

  return (
    <div className="w-full overflow-x-auto">
      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mb-1">
        {SERIES.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            {s.label}
          </div>
        ))}
      </div>

      <svg
        viewBox={`0 0 ${TOTAL_W} ${height}`}
        className="w-full"
        role="img"
        aria-label="Wins / Draws / Losses per year"
      >
        {/* Y-axis grid + labels */}
        {yTicks.map((tick) => (
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
        ))}

        {/* Dots (no connecting lines) */}
        {dotR > 0 &&
          sorted.map((d, i) =>
            SERIES.map((s) => (
              <circle
                key={`${s.key}-${i}`}
                cx={xScale(i)}
                cy={yScale(d[s.key])}
                r={dotR}
                fill={s.color}
                opacity={0.85}
              />
            )),
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
      </svg>
    </div>
  );
}
