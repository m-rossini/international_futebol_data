"use client";

import { useEffect, useState, useCallback } from "react";
import { Trophy, ChevronUp, ChevronDown, Minus, Search, TrendingUp, LineChart, Calendar } from "lucide-react";
import { CountryFlag } from "@/components/shared/CountryFlag";
import { DownloadButton } from "@/components/shared/DownloadButton";
import { logApiCall } from "@/lib/observability";

const API = "/api/proxy";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface RankingEntry {
  rank: number;
  country_full: string;
  country_abrv: string;
  total_points: number;
  previous_points: number;
  rank_change: number;
  confederation: string;
  rank_date: string;
  cur_year_avg: number;
  last_year_avg: number;
}

interface CurrentRanking {
  rank_date: string;
  top_n: number;
  ranking: RankingEntry[];
}

interface HistoryEntry {
  rank: number;
  country_full: string;
  total_points: number;
  rank_date: string;
}

interface CountryHistory {
  country: string;
  country_abrv: string;
  confederation: string;
  snapshots: number;
  from: string;
  to: string;
  history: HistoryEntry[];
}

/* ------------------------------------------------------------------ */
/*  Rank change icon helper                                            */
/* ------------------------------------------------------------------ */
function RankChange({ change }: { change: number }) {
  if (change > 0)
    return <span className="inline-flex items-center gap-0.5 text-green-600 text-xs font-medium"><ChevronUp size={14} />{change}</span>;
  if (change < 0)
    return <span className="inline-flex items-center gap-0.5 text-red-600 text-xs font-medium"><ChevronDown size={14} />{Math.abs(change)}</span>;
  return <span className="inline-flex items-center gap-0.5 text-gray-400 text-xs"><Minus size={14} /></span>;
}

/* ------------------------------------------------------------------ */
/*  Simple sparkline chart                                             */
/* ------------------------------------------------------------------ */
function RankHistoryChart({ data }: { data: HistoryEntry[] }) {
  if (!data || data.length < 2) return <p className="text-xs text-gray-400">Not enough data for chart.</p>;

  const points = [...data].sort((a, b) => new Date(a.rank_date).getTime() - new Date(b.rank_date).getTime());
  const maxRank = Math.max(...points.map((p) => p.rank)) + 5;
  const minRank = Math.max(0, Math.min(...points.map((p) => p.rank)) - 5);
  const range = maxRank - minRank || 1;

  const w = 600, h = 250;
  const pad = { top: 20, right: 20, bottom: 30, left: 50 };
  const iw = w - pad.left - pad.right;
  const ih = h - pad.top - pad.bottom;

  const xScale = (i: number) => pad.left + (i / (points.length - 1)) * iw;
  const yScale = (r: number) => pad.top + ((r - minRank) / range) * ih;

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(p.rank).toFixed(1)}`)
    .join(" ");

  // Y-axis ticks
  const yTicks: number[] = [];
  const tickStep = Math.max(1, Math.round(range / 5));
  for (let r = Math.ceil(minRank / tickStep) * tickStep; r <= maxRank; r += tickStep) {
    yTicks.push(r);
  }

  // X-axis ticks (show a few dates)
  const xTickIndices: number[] = [];
  const xStep = Math.max(1, Math.floor(points.length / 6));
  for (let i = 0; i < points.length; i += xStep) {
    xTickIndices.push(i);
  }
  if (xTickIndices[xTickIndices.length - 1] !== points.length - 1) xTickIndices.push(points.length - 1);

  return (
    <div className="overflow-x-auto">
      <svg width={w} height={h} className="min-w-[600px]">
        {/* Grid lines */}
        {yTicks.map((r) => (
          <g key={r}>
            <line
              x1={pad.left} y1={yScale(r)} x2={w - pad.right} y2={yScale(r)}
              stroke="#e5e7eb" strokeWidth={1}
            />
            <text x={pad.left - 6} y={yScale(r) + 4} textAnchor="end" className="text-[10px] fill-gray-400">
              #{r}
            </text>
          </g>
        ))}
        {/* X-axis labels */}
        {xTickIndices.map((i) => (
          <text
            key={i}
            x={xScale(i)} y={h - 6} textAnchor="middle"
            className="text-[10px] fill-gray-400"
          >
            {points[i].rank_date.slice(0, 7)}
          </text>
        ))}
        {/* Line */}
        <path d={linePath} fill="none" stroke="#3b82f6" strokeWidth={2} />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={xScale(i)} cy={yScale(p.rank)} r={2.5} fill="#3b82f6" stroke="white" strokeWidth={1} />
        ))}
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

/** Fetch current top-N ranking */
function useCurrentRanking(topN: number) {
  const [data, setData] = useState<CurrentRanking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    fetch(`${API}/fifa-ranking/current?top_n=${topN}`)
      .then((r) => {
        logApiCall(`/fifa-ranking/current?top_n=${topN}`, performance.now() - t0, r.status, {});
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [topN]);

  return { data, loading, error };
}

/** Fetch historical ranking for a country */
function useCountryHistory(country: string | null) {
  const [data, setData] = useState<CountryHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!country) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    fetch(`${API}/fifa-ranking/history/${encodeURIComponent(country)}`)
      .then((r) => {
        logApiCall(`/fifa-ranking/history/${country}`, performance.now() - t0, r.status, {});
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [country]);

  return { data, loading, error };
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export function FifaRankingClient() {
  const [topN, setTopN] = useState(20);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const { data: current, loading, error } = useCurrentRanking(topN);
  const { data: history, loading: histLoading, error: histError } = useCountryHistory(selectedCountry);

  const confederations = ["ALL", "UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"];
  const [confFilter, setConfFilter] = useState("ALL");

  const filteredRanking = current?.ranking?.filter((e) => {
    if (confFilter !== "ALL" && e.confederation !== confFilter) return false;
    if (search && !e.country_full.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }) ?? [];

  return (
    <div className="space-y-8">
      {/* ---- Current Ranking ---- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <Trophy size={16} className="text-amber-500" />
            Current Ranking
            {current && <span className="text-xs font-normal text-gray-400">({current.rank_date})</span>}
          </h2>
          <div className="flex items-center gap-3">
            {/* Confederation filter */}
            <select
              value={confFilter}
              onChange={(e) => setConfFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:ring-1 focus:ring-blue-400"
            >
              {confederations.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            {/* Top N selector */}
            <select
              value={topN}
              onChange={(e) => setTopN(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:ring-1 focus:ring-blue-400"
            >
              {[10, 20, 30, 50, 100].map((n) => <option key={n} value={n}>Top {n}</option>)}
            </select>
            {/* Download */}
            {current?.ranking && (
              <DownloadButton
                data={current.ranking as unknown as Record<string, unknown>[]}
                filename={`fifa-ranking-${current.rank_date}`}
                label="CSV"
              />
            )}
          </div>
        </div>

        {loading && <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading rankings…</div>}
        {error && <div className="p-8 text-center text-sm text-red-500">{error}</div>}

        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">Country</th>
                  <th className="text-right px-4 py-3 font-medium">Points</th>
                  <th className="text-right px-4 py-3 font-medium">Change</th>
                  <th className="text-center px-4 py-3 font-medium">Conf.</th>
                  <th className="text-right px-4 py-3 font-medium">Avg (Year)</th>
                  <th className="text-center px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filteredRanking.map((entry) => (
                  <tr
                    key={entry.country_full}
                    className={`border-b border-gray-50 hover:bg-blue-50/40 transition-colors cursor-pointer ${
                      selectedCountry === entry.country_full ? "bg-blue-50" : ""
                    }`}
                    onClick={() => setSelectedCountry(entry.country_full)}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-800">{entry.rank}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CountryFlag country={entry.country_full} size={16} />
                        <span className="font-medium text-gray-700">{entry.country_full}</span>
                        <span className="text-[10px] text-gray-400 uppercase">({entry.country_abrv})</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-700">
                      {entry.total_points.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RankChange change={entry.rank_change} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                        {entry.confederation}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-gray-500 text-xs">
                      {entry.cur_year_avg?.toFixed(1) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {selectedCountry === entry.country_full ? (
                        <span className="text-[10px] text-blue-600 font-medium">SELECTED</span>
                      ) : (
                        <span className="text-[10px] text-gray-300 hover:text-blue-500">View history</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRanking.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">No results match your filters.</div>
            )}
          </div>
        )}
      </section>

      {/* ---- Country History ---- */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
            <TrendingUp size={16} className="text-blue-500" />
            Ranking History
          </h2>
          <div className="flex items-center gap-2">
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder="Search country…"
              value={selectedCountry ?? ""}
              onChange={(e) => setSelectedCountry(e.target.value || null)}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-48 text-gray-600 focus:ring-1 focus:ring-blue-400 focus:outline-none"
              list="country-list"
            />
            <datalist id="country-list">
              {current?.ranking?.map((e) => (
                <option key={e.country_full} value={e.country_full} />
              ))}
            </datalist>
          </div>
        </div>

        {!selectedCountry && (
          <div className="p-8 text-center text-sm text-gray-400">
            Click a country in the ranking table, or type a country name above.
          </div>
        )}

        {histLoading && <div className="p-8 text-center text-sm text-gray-400 animate-pulse">Loading history…</div>}
        {histError && <div className="p-8 text-center text-sm text-red-500">{histError}</div>}

        {history && !histLoading && (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <CountryFlag country={history.country} size={24} />
              <span className="font-semibold text-gray-800">{history.country}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{history.confederation}</span>
              <span className="text-xs text-gray-400">
                <Calendar size={12} className="inline mr-1" />
                {history.from} → {history.to} ({history.snapshots} snapshots)
              </span>
            </div>
            <RankHistoryChart data={history.history} />
            <div className="text-xs text-gray-400 mt-2">
              <LineChart size={12} className="inline mr-1" />
              Rank over time — lower is better
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
