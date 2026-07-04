'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Trophy, TrendingUp, Search, LineChart, Calendar, Info, Filter } from 'lucide-react';
import { CountryFlag } from '@/components/shared/CountryFlag';
import { DownloadButton } from '@/components/shared/DownloadButton';
import { FilterBar } from '@/components/shared/FilterBar';
import { logApiCall } from '@/lib/observability';

const API = '/api/proxy';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface EloEntry {
  ranking: number;
  team: string;
  elo_rating: number;
  date: string;
}

interface CurrentElo {
  calculation_date: string;
  total_teams: number;
  top_n: number;
  filtered: boolean;
  ranking: EloEntry[];
}

interface EloHistoryEntry {
  date: string;
  team: string;
  opponent: string;
  elo_rating: number;
  elo_rating_new: number;
  opponent_elo: number;
  home_score: number;
  away_score: number;
  tournament: string;
  is_neutral: boolean;
  expected_score: number;
  actual_result: number;
  rating_change: number;
}

interface TeamHistory {
  team: string;
  matches_calculated: number;
  from: string;
  to: string;
  min_elo: number;
  max_elo: number;
  current_elo: number;
  history: EloHistoryEntry[];
}

interface EloSummary {
  total_matches_calculated: number;
  total_teams: number;
  min_elo: number;
  max_elo: number;
  mean_elo: number;
  median_elo: number;
  date_range: { from: string; to: string };
  filtered: boolean;
  top_10: EloEntry[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildQs(params: URLSearchParams): string {
  const q = new URLSearchParams();
  for (const key of ['tournaments', 'countries', 'date_from', 'date_to']) {
    const v = params.get(key);
    if (v) q.set(key, v);
  }
  return q.toString();
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

function useCurrentElo(topN: number, qs: string) {
  const [data, setData] = useState<CurrentElo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    const params = qs ? `top_n=${topN}&${qs}` : `top_n=${topN}`;
    const t0 = performance.now();
    fetch(`${API}/elo-ranking/current?${params}`)
      .then((r) => {
        logApiCall(`/elo-ranking/current?${params}`, performance.now() - t0, r.status, {});
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [topN, qs]);

  return { data, loading, error };
}

function useSummary(qs: string) {
  const [data, setData] = useState<EloSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = qs ? `?${qs}` : '';
    const t0 = performance.now();
    fetch(`${API}/elo-ranking/summary${params}`)
      .then((r) => {
        logApiCall(`/elo-ranking/summary${params}`, performance.now() - t0, r.status, {});
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [qs]);

  return { data, loading };
}

function useTeamHistory(team: string | null, qs: string) {
  const [data, setData] = useState<TeamHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!team) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    const params = qs ? `?${qs}` : '';
    const t0 = performance.now();
    fetch(`${API}/elo-ranking/history/${encodeURIComponent(team)}${params}`)
      .then((r) => {
        logApiCall(`/elo-ranking/history/${team}${params}`, performance.now() - t0, r.status, {});
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [team, qs]);

  return { data, loading, error };
}

/* ------------------------------------------------------------------ */
/*  ELO History Chart                                                  */
/* ------------------------------------------------------------------ */
function EloHistoryChart({ data }: { data: EloHistoryEntry[] }) {
  if (!data || data.length < 2)
    return <p className="text-xs text-gray-400">Not enough data for chart.</p>;

  const points = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const minElo = Math.min(...points.map((p) => p.elo_rating_new)) - 50;
  const maxElo = Math.max(...points.map((p) => p.elo_rating_new)) + 50;
  const range = maxElo - minElo || 1;

  const w = 600,
    h = 250;
  const pad = { top: 20, right: 20, bottom: 30, left: 60 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;

  const xScale = (i: number) => pad.left + (i / (points.length - 1)) * iw;
  const yScale = (v: number) => pad.top + ((maxElo - v) / range) * ih;

  const linePath = points
    .map(
      (p, i) =>
        `${i === 0 ? 'M' : 'L'}${xScale(i).toFixed(1)},${yScale(p.elo_rating_new).toFixed(1)}`,
    )
    .join(' ');

  // Y-axis ticks
  const yStep = Math.max(50, Math.round(range / 5 / 50) * 50);
  const yTicks: number[] = [];
  for (let v = Math.ceil(minElo / yStep) * yStep; v <= maxElo; v += yStep) {
    yTicks.push(v);
  }

  // X-axis ticks
  const xTickIndices: number[] = [];
  const xStep = Math.max(1, Math.floor(points.length / 6));
  for (let i = 0; i < points.length; i += xStep) xTickIndices.push(i);
  if (xTickIndices[xTickIndices.length - 1] !== points.length - 1)
    xTickIndices.push(points.length - 1);

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} className="min-w-[600px]">
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={pad.left}
              y1={yScale(v)}
              x2={w - pad.right}
              y2={yScale(v)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text
              x={pad.left - 6}
              y={yScale(v) + 4}
              textAnchor="end"
              className="text-[10px] fill-gray-400"
            >
              {v}
            </text>
          </g>
        ))}
        {xTickIndices.map((i) => (
          <text
            key={i}
            x={xScale(i)}
            y={h - 6}
            textAnchor="middle"
            className="text-[10px] fill-gray-400"
          >
            {points[i].date.slice(0, 7)}
          </text>
        ))}
        <path d={linePath} fill="none" stroke="#8b5cf6" strokeWidth={2} />
        {points.map((p, i) => (
          <circle
            key={i}
            cx={xScale(i)}
            cy={yScale(p.elo_rating_new)}
            r={2}
            fill="#8b5cf6"
            stroke="white"
            strokeWidth={1}
          />
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function EloRankingClient() {
  const sp = useSearchParams();
  const [topN, setTopN] = useState(20);
  const [search] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const qs = useMemo(() => buildQs(sp), [sp]);

  const { data: current, loading, error } = useCurrentElo(topN, qs);
  const { data: summary } = useSummary(qs);
  const {
    data: history,
    loading: histLoading,
    error: histError,
  } = useTeamHistory(selectedTeam, qs);

  const isFiltered = current?.filtered ?? false;

  const filteredRanking =
    current?.ranking?.filter((e) => {
      if (search && !e.team.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }) ?? [];

  return (
    <div className="space-y-8">
      {/* ---- Filters ---- */}
      <FilterBar fields={{ teams: false }} injectDefaults={false} />

      {/* ---- Filter Info Banner ---- */}
      {isFiltered && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2">
          <Filter size={14} className="text-amber-600 shrink-0" />
          <span className="text-xs text-amber-700">
            ELO recalculated on filtered matches. Ratings reflect only the selected filters, not the
            full match history.
          </span>
        </div>
      )}

      {/* ---- Summary Cards ---- */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Teams</div>
            <div className="text-lg font-bold text-gray-800">{summary.total_teams}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Matches</div>
            <div className="text-lg font-bold text-gray-800">
              {summary.total_matches_calculated.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Max ELO</div>
            <div className="text-lg font-bold text-gray-800">{summary.max_elo.toFixed(0)}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Date Range</div>
            <div className="text-sm font-semibold text-gray-800">
              {summary.date_range.from.slice(0, 4)}–{summary.date_range.to.slice(0, 4)}
            </div>
          </div>
        </div>
      )}

      {/* ---- Current Ranking ---- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Trophy size={16} className="text-violet-500" />
            Current ELO Ranking
            {current && (
              <span className="text-xs font-normal text-gray-400">
                ({current.calculation_date})
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:ring-1 focus:ring-blue-400"
            >
              {[10, 20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
            </select>
            {current?.ranking && (
              <DownloadButton
                data={current.ranking as unknown as Record<string, unknown>[]}
                filename={`elo-ranking-${current.calculation_date}`}
                label="CSV"
              />
            )}
          </div>
        </div>

        {loading && (
          <div className="p-8 text-center text-sm text-gray-400 animate-pulse">
            Calculating ELO ratings…
          </div>
        )}
        {error && <div className="p-8 text-center text-sm text-red-500">{error}</div>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">Team</th>
                  <th className="text-right px-4 py-3 font-medium">ELO Rating</th>
                  <th className="text-right px-4 py-3 font-medium">Last Match</th>
                  <th className="text-center px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRanking.map((entry) => (
                  <tr
                    key={entry.team}
                    className={`border-b border-gray-50 hover:bg-violet-50/40 transition-colors cursor-pointer ${
                      selectedTeam === entry.team ? 'bg-violet-50' : ''
                    }`}
                    onClick={() => setSelectedTeam(entry.team)}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800">{entry.ranking}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CountryFlag countryName={entry.team} size={16} />
                        <span className="font-medium text-gray-700">{entry.team}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-violet-700">
                      {entry.elo_rating.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-400 text-xs">
                      {entry.date?.slice(0, 10) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {selectedTeam === entry.team ? (
                        <span className="text-[10px] text-violet-600 font-medium">SELECTED</span>
                      ) : (
                        <span className="text-[10px] text-gray-300 hover:text-violet-500">
                          View history
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRanking.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">
                No results match your search.
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---- Team History ---- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <TrendingUp size={16} className="text-violet-500" />
            ELO History
          </h2>
          <div className="flex items-center gap-2">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search team…"
              value={selectedTeam ?? ''}
              onChange={(e) => setSelectedTeam(e.target.value || null)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-48 text-gray-600 focus:ring-1 focus:ring-blue-400 focus:outline-none"
              list="team-list"
            />
            <datalist id="team-list">
              {current?.ranking?.map((e) => <option key={e.team} value={e.team} />)}
            </datalist>
          </div>
        </div>

        {!selectedTeam && (
          <div className="p-8 text-center text-sm text-gray-400">
            Click a team in the ranking table, or type a team name above.
          </div>
        )}

        {histLoading && (
          <div className="p-8 text-center text-sm text-gray-400 animate-pulse">
            Loading history…
          </div>
        )}
        {histError && <div className="p-8 text-center text-sm text-red-500">{histError}</div>}

        {history && !histLoading && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <CountryFlag countryName={history.team} size={24} />
              <span className="font-semibold text-gray-800">{history.team}</span>
              <span className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                ELO {history.current_elo.toFixed(0)}
              </span>
              <span className="text-xs text-gray-400">
                <Calendar size={12} className="inline mr-1" />
                {history.from} → {history.to} ({history.matches_calculated} matches)
              </span>
            </div>
            <EloHistoryChart data={history.history} />
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <span className="text-gray-400">Best</span>
                <div className="font-semibold text-green-600">{history.max_elo.toFixed(0)}</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <span className="text-gray-400">Current</span>
                <div className="font-semibold text-violet-600">
                  {history.current_elo.toFixed(0)}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <span className="text-gray-400">Worst</span>
                <div className="font-semibold text-red-600">{history.min_elo.toFixed(0)}</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2">
              <LineChart size={12} className="inline mr-1" />
              ELO rating over time — calculated from ~49,000 international matches since 1872
            </div>
          </div>
        )}
      </section>

      {/* ---- Info ---- */}
      <section className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700 space-y-1">
            <p className="font-semibold">How ELO Ratings Work</p>
            <p>
              ELO ratings are calculated from all historical match results. Each match updates both
              teams&apos; ratings based on the actual result vs. the expected result. Home teams get
              a +100 point advantage. Neutral venue matches (World Cup, continental cups) have no
              home advantage.
            </p>
            <p>
              Formula: <code>new_elo = old_elo + K × (result − expected)</code> where K=60, and
              <code>expected = 1 / (1 + 10^((elo_opponent − elo_team) / 400))</code>. Teams start at
              1500 ELO.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
