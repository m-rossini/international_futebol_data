"use client";

import { useMemo } from "react";

interface Match {
  date: string;
  home_team: string;
  away_team: string;
  home_score: number;
  away_score: number;
}

interface Props {
  matches: Match[];
  team1: string;
  team2: string;
  height?: number;
}

function yearFromDate(raw: string): number {
  return parseInt(raw.slice(0, 4), 10);
}

const CHART_W = 400;
const PAD_LEFT = 36;
const PAD_RIGHT = 8;
const PAD_BOTTOM = 18;
const PAD_TOP = 8;

export function CumulativeWinsChart({
  matches,
  team1,
  team2,
  height = 90,
}: Props) {
  // All hooks must come before any conditional return
  const points = useMemo(() => {
    if (matches.length === 0) {
      return { t1: [] as [number, number][], t2: [] as [number, number][], years: [] as number[], maxWins: 1 };
    }

    const sorted = [...matches].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    let t1Wins = 0;
    let t2Wins = 0;
    const t1Pts: [number, number][] = [];
    const t2Pts: [number, number][] = [];
    const years: number[] = [];
    let maxWins = 1;

    for (const m of sorted) {
      const year = yearFromDate(m.date);
      const isHome = m.home_team === team1;
      const t1Score = isHome ? m.home_score : m.away_score;
      const t2Score = isHome ? m.away_score : m.home_score;

      if (t1Score > t2Score) t1Wins++;
      else if (t2Score > t1Score) t2Wins++;

      t1Pts.push([year, t1Wins]);
      t2Pts.push([year, t2Wins]);
      years.push(year);
      if (t1Wins > maxWins) maxWins = t1Wins;
      if (t2Wins > maxWins) maxWins = t2Wins;
    }

    return { t1: t1Pts, t2: t2Pts, years, maxWins };
  }, [matches, team1]);

  const { t1, t2, years, maxWins } = points;

  const yTicks = useMemo(() => {
    const step = Math.max(1, Math.ceil(maxWins / 4));
    const ticks: number[] = [];
    for (let i = 0; i <= maxWins; i += step) ticks.push(i);
    if (ticks[ticks.length - 1] !== maxWins) ticks.push(maxWins);
    return ticks;
  }, [maxWins]);

  const xLabels = useMemo(() => {
    const labels: { idx: number; year: number }[] = [];
    const n = t1.length;
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
  }, [t1.length, years]);

  if (matches.length === 0) {
    return (
      <div className="text-center text-xs text-gray-400 py-2">
        No match data available
      </div>
    );
  }

  const totalW = PAD_LEFT + CHART_W + PAD_RIGHT;
  const chartH = height - PAD_TOP - PAD_BOTTOM;
  const lastIdx = Math.max(t1.length - 1, 1);

  const xScale = (i: number) => PAD_LEFT + (i / lastIdx) * CHART_W;
  const yScale = (v: number) => PAD_TOP + chartH - (v / maxWins) * chartH;

  const t1Line = t1.map((_, i) => `${xScale(i)},${yScale(t1[i][1])}`).join(" ");
  const t2Line = t2.map((_, i) => `${xScale(i)},${yScale(t2[i][1])}`).join(" ");

  const t1Area = `${t1Line} ${xScale(lastIdx)},${yScale(0)} ${PAD_LEFT},${yScale(0)}`;
  const t2Area = `${t2Line} ${xScale(lastIdx)},${yScale(0)} ${PAD_LEFT},${yScale(0)}`;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${height}`}
      className="w-full max-w-[500px]"
      role="img"
      aria-label={`Cumulative wins: ${team1} vs ${team2}`}
    >
      {/* Grid lines */}
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

      {/* Gradients */}
      <defs>
        <linearGradient id="t1Grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="t2Grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Shaded areas */}
      <polygon points={t1Area} fill="url(#t1Grad)" opacity={0.12} />
      <polygon points={t2Area} fill="url(#t2Grad)" opacity={0.12} />

      {/* Lines */}
      <polyline
        points={t1Line}
        fill="none"
        stroke="#3b82f6"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />
      <polyline
        points={t2Line}
        fill="none"
        stroke="#ef4444"
        strokeWidth={1.5}
        strokeLinejoin="round"
      />

      {/* Endpoint dots + labels */}
      {lastIdx >= 0 && (
        <>
          <circle cx={xScale(t1.length - 1)} cy={yScale(t1[t1.length - 1][1])} r={2.5} fill="#3b82f6" />
          <circle cx={xScale(t2.length - 1)} cy={yScale(t2[t2.length - 1][1])} r={2.5} fill="#ef4444" />
          <text
            x={xScale(t1.length - 1) + 4}
            y={yScale(t1[t1.length - 1][1]) + 3}
            fontSize={8}
            fill="#3b82f6"
            fontWeight={600}
          >
            {t1[t1.length - 1][1]}
          </text>
          <text
            x={xScale(t2.length - 1) + 4}
            y={yScale(t2[t2.length - 1][1]) + 3}
            fontSize={8}
            fill="#ef4444"
            fontWeight={600}
          >
            {t2[t2.length - 1][1]}
          </text>
        </>
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
      <g transform={`translate(${PAD_LEFT + 4}, ${PAD_TOP})`}>
        <line x1={0} y1={3} x2={14} y2={3} stroke="#3b82f6" strokeWidth={2} />
        <text x={18} y={6} fontSize={9} fill="#6b7280">
          {team1}
        </text>
        <line x1={70} y1={3} x2={84} y2={3} stroke="#ef4444" strokeWidth={2} />
        <text x={88} y={6} fontSize={9} fill="#6b7280">
          {team2}
        </text>
      </g>
    </svg>
  );
}
