"use client";

import { useEffect, useState } from "react";
import { Search, TrendingUp, Calendar, Info, AlertCircle } from "lucide-react";
import { CountryFlag } from "@/components/shared/CountryFlag";
import { logApiCall } from "@/lib/observability";

const API = "/api/proxy";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface TimelinePoint {
  date: string;
  fifa_rank: number;
  fifa_points: number;
  elo_rating: number;
  fifa_rank_change: number;
}

interface TeamComparisonData {
  team: string;
  confederation: string;
  country_abrv: string;
  fifa_snapshots: number;
  elo_matches: number;
  merged_points: number;
  from: string | null;
  to: string | null;
  timeline: TimelinePoint[];
}

/* ------------------------------------------------------------------ */
/*  Dual Chart                                                         */
/* ------------------------------------------------------------------ */
function DualTimelineChart({ data }: { data: TimelinePoint[] }) {
  if (!data || data.length < 2)
    return <p className="text-xs text-gray-400">Not enough data for chart.</p>;

  const w = 800, h = 320;
  const pad = { top: 30, right: 70, bottom: 35, left: 55 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;

  // Scales
  const maxFifaRank = Math.max(...data.map((p) => p.fifa_rank)) + 5;
  const minFifaRank = Math.max(0, Math.min(...data.map((p) => p.fifa_rank)) - 5);
  const fifaRange = maxFifaRank - minFifaRank || 1;

  const maxElo = Math.max(...data.map((p) => p.elo_rating)) + 50;
  const minElo = Math.max(0, Math.min(...data.map((p) => p.elo_rating)) - 50);
  const eloRange = maxElo - minElo || 1;

  const xScale = (i: number) => pad.left + (i / (data.length - 1)) * iw;
  const yFifa = (r: number) => pad.top + ((r - minFifaRank) / fifaRange) * ih;
  const yElo = (v: number) => pad.top + ((maxElo - v) / eloRange) * ih;

  // Paths
  const fifaPath = data
    .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yFifa(p.fifa_rank).toFixed(1)}`)
    .join(" ");

  const eloPath = data
    .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yElo(p.elo_rating).toFixed(1)}`)
    .join(" ");

  // Y-axis ticks - FIFA (left)
  const fifaStep = Math.max(5, Math.round(fifaRange / 5 / 5) * 5);
  const fifaTicks: number[] = [];
  for (let r = Math.ceil(minFifaRank / fifaStep) * fifaStep; r <= maxFifaRank; r += fifaStep)
    fifaTicks.push(r);

  // Y-axis ticks - ELO (right)
  const eloStep = Math.max(50, Math.round(eloRange / 5 / 50) * 50);
  const eloTicks: number[] = [];
  for (let v = Math.ceil(minElo / eloStep) * eloStep; v <= maxElo; v += eloStep)
    eloTicks.push(v);

  // X-axis ticks
  const xTickIndices: number[] = [];
  const xStep = Math.max(1, Math.floor(data.length / 8));
  for (let i = 0; i < data.length; i += xStep) xTickIndices.push(i);
  if (xTickIndices[xTickIndices.length - 1] !== data.length - 1) xTickIndices.push(data.length - 1);

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} className="min-w-[800px]">
        {/* Grid */}
        {fifaTicks.map((r) => (
          <g key={`fg-${r}`}>
            <line x1={pad.left} y1={yFifa(r)} x2={w - pad.right} y2={yFifa(r)} stroke="#e5e7eb" strokeWidth={1} />
            <text x={pad.left - 6} y={yFifa(r) + 4} textAnchor="end" className="text-[10px] fill-amber-600">
              #{r}
            </text>
          </g>
        ))}
        {eloTicks.map((v) => (
          <g key={`eg-${v}`}>
            <text x={w - pad.right + 8} y={yElo(v) + 4} textAnchor="start" className="text-[10px] fill-violet-600">
              {v}
            </text>
          </g>
        ))}
        {/* X-axis labels */}
        {xTickIndices.map((i) => (
          <text key={i} x={xScale(i)} y={h - 8} textAnchor="middle" className="text-[9px] fill-gray-400">
            {data[i].date.slice(0, 7)}
          </text>
        ))}

        {/* FIFA line (amber) */}
        <path d={fifaPath} fill="none" stroke="#d97706" strokeWidth={2} />
        {data.map((p, i) => (
          <circle key={`f-${i}`} cx={xScale(i)} cy={yFifa(p.fifa_rank)} r={2.5} fill="#d97706" stroke="white" strokeWidth={1} />
        ))}

        {/* ELO line (violet) */}
        <path d={eloPath} fill="none" stroke="#8b5cf6" strokeWidth={2} />
        {data.map((p, i) => (
          <circle key={`e-${i}`} cx={xScale(i)} cy={yElo(p.elo_rating)} r={2.5} fill="#8b5cf6" stroke="white" strokeWidth={1} />
        ))}

        {/* Legend */}
        <rect x={pad.left + 10} y={6} width={10} height={10} fill="#d97706" rx={2} />
        <text x={pad.left + 24} y={14} className="text-[10px] fill-gray-600">FIFA Rank</text>
        <rect x={pad.left + 100} y={6} width={10} height={10} fill="#8b5cf6" rx={2} />
        <text x={pad.left + 114} y={14} className="text-[10px] fill-gray-600">ELO Rating</text>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */
function useTeamComparison(team: string | null) {
  const [data, setData] = useState<TeamComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!team) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    fetch(`${API}/ranking-comparison/${encodeURIComponent(team)}`)
      .then((r) => {
        logApiCall(`/ranking-comparison/${team}`, performance.now() - t0, r.status, {});
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [team]);

  return { data, loading, error };
}

/* ------------------------------------------------------------------ */
/*  Favourite teams                                                    */
/* ------------------------------------------------------------------ */
const SUGGESTED_TEAMS = [
  "Brazil", "Argentina", "France", "England", "Germany",
  "Spain", "Italy", "Netherlands", "Portugal", "Uruguay",
  "Belgium", "Croatia", "Colombia", "Japan", "USA",
];

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function TeamRankingComparisonClient() {
  const [selectedTeam, setSelectedTeam] = useState<string>("Brazil");
  const [searchInput, setSearchInput] = useState("");

  const { data, loading, error } = useTeamComparison(selectedTeam);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSelectedTeam(searchInput.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Search + quick picks */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <form onSubmit={handleSearch} className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search team (e.g. Brazil, England, Japan)..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-gray-600 focus:ring-1 focus:ring-blue-400 focus:outline-none"
              list="team-suggest"
            />
            <datalist id="team-suggest">
              {SUGGESTED_TEAMS.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Compare
          </button>
        </form>

        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-gray-400 mr-1 py-1">Quick select:</span>
          {SUGGESTED_TEAMS.map((t) => (
            <button
              key={t}
              onClick={() => { setSelectedTeam(t); setSearchInput(""); }}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors ${
                selectedTeam === t
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Loading/Error */}
      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-sm text-gray-400 animate-pulse">
          Loading comparison data for {selectedTeam}…
        </div>
      )}
      {error && (
        <div className="bg-white rounded-xl border border-red-200 shadow-sm p-8 text-center text-sm text-red-500 flex items-center justify-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <>
          {/* Team header */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-3">
              <CountryFlag country={data.team} size={32} />
              <div>
                <h2 className="text-lg font-bold text-gray-800">{data.team}</h2>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                    {data.confederation}
                  </span>
                  <span className="uppercase">({data.country_abrv})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Timeline</div>
              <div className="text-lg font-bold text-gray-800">{data.merged_points} pts</div>
              <div className="text-[10px] text-gray-400">{data.from} → {data.to}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="text-[10px] text-amber-600 uppercase tracking-wider">FIFA Snapshots</div>
              <div className="text-lg font-bold text-amber-700">{data.fifa_snapshots}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="text-[10px] text-violet-600 uppercase tracking-wider">ELO Matches</div>
              <div className="text-lg font-bold text-violet-700">{data.elo_matches.toLocaleString()}</div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="text-[10px] text-gray-400 uppercase tracking-wider">Coverage</div>
              <div className="text-sm font-semibold text-gray-800">{data.from?.slice(0, 4)}–{data.to?.slice(0, 4)}</div>
            </div>
          </div>

          {/* Dual chart */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-gray-400" />
              FIFA Rank vs ELO Rating Over Time
            </h3>
            <DualTimelineChart data={data.timeline} />
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />
                FIFA Rank (left axis, lower = better)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-sm bg-violet-500 inline-block" />
                ELO Rating (right axis, higher = better)
              </span>
            </div>
          </section>

          {/* Timeline table */}
          <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Calendar size={14} className="text-gray-400" />
                Timeline Data
              </h3>
            </div>
            <div className="overflow-x-auto max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-right px-4 py-3 font-medium">FIFA Rank</th>
                    <th className="text-right px-4 py-3 font-medium">FIFA Pts</th>
                    <th className="text-right px-4 py-3 font-medium">ELO Rating</th>
                    <th className="text-right px-4 py-3 font-medium">FIFA Rank Δ</th>
                  </tr>
                </thead>
                <tbody>
                  {data.timeline.slice().reverse().map((pt) => (
                    <tr key={pt.date} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">{pt.date}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-amber-700">
                        #{pt.fifa_rank}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-gray-500 text-xs">
                        {pt.fifa_points}
                      </td>
                      <td className="px-4 py-2 text-right font-mono font-semibold text-violet-700">
                        {pt.elo_rating.toFixed(0)}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-xs">
                        {pt.fifa_rank_change > 0 ? (
                          <span className="text-green-600">▲ {pt.fifa_rank_change}</span>
                        ) : pt.fifa_rank_change < 0 ? (
                          <span className="text-red-600">▼ {Math.abs(pt.fifa_rank_change)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center text-sm text-gray-400">
          Select a team above to compare FIFA vs ELO history.
        </div>
      )}

      {/* Info */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-indigo-500 mt-0.5 shrink-0" />
          <div className="text-xs text-indigo-700 space-y-1">
            <p className="font-semibold">About this comparison</p>
            <p>
              This chart overlays a team&apos;s <strong>FIFA ranking</strong> (official, monthly snapshots since 1993)
              with its <strong>ELO rating</strong> (calculated from every match result since 1872).
              FIFA rank uses the left axis (lower = better), ELO rating uses the right axis (higher = better).
              A team that performs better than expected in matches will see its ELO rise — often predicting future FIFA ranking improvements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
