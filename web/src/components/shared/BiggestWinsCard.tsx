"use client";

import { CountryFlag } from "./CountryFlag";
import type { BiggestWin } from "@/lib/types";

/** Consistent date formatting: "24 Nov 2022" */
function fmtDate(raw: string): string {
  const d = new Date(raw.slice(0, 10) + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  team: string;
  opponent: string;
  wins: BiggestWin[];
}

export function BiggestWinsCard({ team, opponent, wins }: Props) {
  if (wins.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3 inline-flex items-center gap-1.5">
        <CountryFlag countryName={team} size={14} />
        Top wins vs {opponent}
      </h3>
      <div className="divide-y divide-gray-100">
        {wins.map((win, i) => {
          const isHome = win.home_team === team;
          const teamScore = isHome ? win.home_score : win.away_score;
          const oppScore = isHome ? win.away_score : win.home_score;
          const opponentName = isHome ? win.away_team : win.home_team;
          const teamBold = "font-semibold";
          const oppBold = "";

          return (
            <div
              key={`${win.date}-${i}`}
              className="flex items-center gap-2.5 py-2 first:pt-0 last:pb-0 text-[13px]"
            >
              {/* Date + tournament */}
              <div className="flex flex-col items-start min-w-0 shrink-0 w-[90px]">
                <span className="text-[11px] text-gray-400 leading-tight">
                  {fmtDate(win.date)}
                </span>
                {win.tournament && (
                  <span className="text-[10px] text-gray-400 leading-tight truncate max-w-[90px]">
                    {win.tournament}
                  </span>
                )}
              </div>

              {/* Home team */}
              <span
                className={`inline-flex items-center gap-1 min-w-0 flex-1 justify-end text-right ${isHome ? teamBold : oppBold}`}
              >
                {isHome ? team : opponentName}
                <CountryFlag
                  countryName={isHome ? team : opponentName}
                  size={12}
                />
              </span>

              {/* Score */}
              <span className="font-mono tabular-nums text-[13px] font-bold shrink-0 w-[44px] text-center">
                {teamScore}&ndash;{oppScore}
              </span>

              {/* Away team */}
              <span
                className={`inline-flex items-center gap-1 min-w-0 flex-1 ${!isHome ? teamBold : oppBold}`}
              >
                <CountryFlag
                  countryName={!isHome ? team : opponentName}
                  size={12}
                />
                {!isHome ? team : opponentName}
              </span>

              {/* Goal margin badge */}
              <span className="text-[10px] text-gray-400 shrink-0 w-[52px] text-right">
                +{win.goal_margin}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
