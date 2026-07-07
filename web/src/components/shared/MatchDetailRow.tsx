'use client';

import { useState, useEffect } from 'react';
import type { MatchDetail } from '@/lib/types';

interface Props {
  date: string;
  homeTeam: string;
  awayTeam: string;
  colSpan: number;
}

function fmtMinute(minute: number | null): string {
  if (minute == null) return '';
  return `${minute}'`;
}

export function MatchDetailRow({ date, homeTeam, awayTeam, colSpan }: Props) {
  const [detail, setDetail] = useState<MatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ date, home_team: homeTeam, away_team: awayTeam });
    fetch(`/api/proxy/matchgoals?${params}`)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then(setDetail)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [date, homeTeam, awayTeam]);

  if (loading) {
    return (
      <div
        className="px-6 py-4 text-sm text-gray-400"
        style={{ gridColumn: `1 / span ${colSpan}` }}
      >
        Loading scorers…
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div
        className="px-6 py-4 text-sm text-gray-400"
        style={{ gridColumn: `1 / span ${colSpan}` }}
      >
        No scorer data available
      </div>
    );
  }

  const scorers = detail.scorers ?? [];
  const shootout = detail.shootout;

  return (
    <div className="px-6 py-4 bg-gray-50/80">
      <div className="flex gap-8 flex-wrap">
        {/* Goal scorer timeline */}
        <div className="flex-1 min-w-[200px]">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
            Goals
          </h4>
          {scorers.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No goals recorded</p>
          ) : (
            <div className="relative pl-4">
              {/* Vertical line */}
              <div className="absolute left-1.5 top-1 bottom-1 w-px bg-gray-300" />
              <div className="space-y-2.5">
                {scorers.map((s, i) => {
                  const isHome = s.team === homeTeam;
                  return (
                    <div key={i} className="relative flex items-start gap-2.5">
                      {/* Dot on timeline */}
                      <div
                        className={`absolute -left-4 top-1.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          isHome ? 'bg-blue-500' : 'bg-red-500'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {s.scorer}
                          </span>
                          {s.penalty && (
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-semibold bg-amber-100 text-amber-700">
                              P
                            </span>
                          )}
                          {s.own_goal && (
                            <span className="inline-flex items-center px-1 py-0.5 rounded text-[9px] font-semibold bg-red-100 text-red-600">
                              OG
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          <span className="font-mono">{fmtMinute(s.minute)}</span>
                          {' · '}
                          <span className={isHome ? 'text-blue-600' : 'text-red-600'}>
                            {s.team}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Shootout info */}
        {shootout && (
          <div className="min-w-[160px]">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">
              Shootout
            </h4>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700">
                PK
              </span>
              <span className="text-sm text-gray-700">
                Won by <span className="font-semibold">{shootout.winner}</span>
              </span>
            </div>
            {shootout.first_shooter && (
              <p className="text-xs text-gray-500 mt-1">First shooter: {shootout.first_shooter}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
