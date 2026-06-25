"use client";

/**
 * A single stat card shown inside the StatsBar grid.
 * The accent controls text color for values like win rate.
 */
export interface StatItem {
  label: string;
  value: string;
  accent?: "green" | "amber" | "red" | "blue" | "neutral";
}

// ---------------------------------------------------------------------------
//  Builders — pure functions that return a StatItem[] from structured data.
//  Use these when you don't want to assemble the array by hand.
// ---------------------------------------------------------------------------

/** Standard match stats (matches / wins / losses / draws / win rate). */
export function buildMatchStats(
  total: number,
  wins: number,
  losses: number,
  draws: number,
  winRate?: number, // 0‑100
): StatItem[] {
  const items: StatItem[] = [
    { label: "Matches", value: total.toLocaleString() },
    { label: "Wins", value: wins.toLocaleString() },
    { label: "Losses", value: losses.toLocaleString() },
    { label: "Draws", value: draws.toLocaleString() },
  ];

  if (winRate !== undefined) {
    const accent =
      winRate >= 60 ? "green" : winRate >= 45 ? "amber" : "red";
    items.push({
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      accent,
    });
  }

  return items;
}

/** Goal stats for a single team — totals and per‑match averages. */
export function buildGoalStats(
  goalsFor: number,
  goalsAgainst: number,
  avgFor?: number, // per‑match average GF
  avgAgainst?: number, // per‑match average GA
  avgDiff?: number, // average goal difference per match
): StatItem[] {
  return [
    { label: "Goals For", value: goalsFor.toLocaleString() },
    { label: "Goals Against", value: goalsAgainst.toLocaleString() },
    {
      label: "Goal Diff",
      value: (goalsFor - goalsAgainst).toLocaleString(),
    },
    { label: "GF Avg", value: avgFor?.toFixed(2) ?? "—" },
    { label: "GA Avg", value: avgAgainst?.toFixed(2) ?? "—" },
    { label: "GD Avg", value: avgDiff?.toFixed(2) ?? "—" },
  ];
}

/** Head‑to‑head comparison — two teams side by side. */
export function buildH2HStats(
  team1: string,
  team1Wins: number,
  draws: number,
  team1Goals: number,
  team2: string,
  team2Wins: number,
  team2Goals: number,
  totalMatches: number,
  avgGoalsPerMatch?: number, // avg total goals per match (rivalry intensity)
): StatItem[] {
  const t1WinRate = totalMatches > 0 ? (team1Wins / totalMatches) * 100 : 0;
  const t2WinRate = totalMatches > 0 ? (team2Wins / totalMatches) * 100 : 0;

  const winRateAccent = (r: number) =>
    r >= 60 ? "green" : r >= 45 ? "amber" : "red";

  return [
    { label: "Matches", value: totalMatches.toLocaleString() },
    { label: `${team1} Wins`, value: team1Wins.toLocaleString() },
    { label: "Draws", value: draws.toLocaleString() },
    { label: `${team2} Wins`, value: team2Wins.toLocaleString() },
    { label: `${team1} Goals`, value: team1Goals.toLocaleString(), accent: "blue" },
    { label: `${team2} Goals`, value: team2Goals.toLocaleString(), accent: "red" },
    {
      label: `${team1} Win%`,
      value: `${t1WinRate.toFixed(1)}%`,
      accent: winRateAccent(t1WinRate),
    },
    {
      label: `${team2} Win%`,
      value: `${t2WinRate.toFixed(1)}%`,
      accent: winRateAccent(t2WinRate),
    },
    ...(avgGoalsPerMatch !== undefined && avgGoalsPerMatch > 0
      ? [
          {
            label: "Avg Goals/Match",
            value: avgGoalsPerMatch.toFixed(1),
          } as StatItem,
        ]
      : []),
  ];
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

interface Props {
  items: StatItem[];
}

const ACCENT_CLASSES: Record<string, string> = {
  green: "text-green-600 font-semibold",
  amber: "text-amber-600 font-semibold",
  red: "text-red-500 font-semibold",
  blue: "text-blue-600 font-semibold",
  neutral: "text-gray-800",
};

export function StatsBar({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(140px, 1fr))` }}
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex flex-col gap-0.5"
        >
          <span className="text-xs font-medium text-gray-500">{item.label}</span>
          <span
            className={`text-xl font-bold ${
              ACCENT_CLASSES[item.accent ?? "neutral"]
            }`}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
