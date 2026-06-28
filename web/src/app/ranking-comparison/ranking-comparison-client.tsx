"use client";

import { useEffect, useState, useRef } from "react";
import { Trophy, TrendingUp, ArrowUpDown, Search, Info, AlertCircle, ScatterChart } from "lucide-react";
import { CountryFlag } from "@/components/shared/CountryFlag";
import { DownloadButton } from "@/components/shared/DownloadButton";
import { logApiCall } from "@/lib/observability";

const API = "/api/proxy";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface ComparisonEntry {
  team: string;
  fifa_rank: number;
  fifa_points: number;
  elo_rank: number;
  elo_rating: number;
  confederation: string;
  country_abrv: string;
  rank_difference: number;
}

interface ComparisonData {
  fifa_snapshot_date: string;
  elo_calculation_date: string;
  total_matched: number;
  comparison: ComparisonEntry[];
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */
function useComparison(topN: number) {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    fetch(`${API}/ranking-comparison?top_n=${topN}`)
      .then((r) => {
        logApiCall(`/ranking-comparison?top_n=${topN}`, performance.now() - t0, r.status, {});
        if (!r.status === 200) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [topN]);

  return { data, loading, error };
}

/* ------------------------------------------------------------------ */
/*  Diff indicator                                                     */
/* ------------------------------------------------------------------ */
function DiffBadge({ diff }: { diff: number }) {
  const abs = Math.abs(diff);
  if (diff === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-gray-400">
        <ArrowUpDown size={12} /> 0
      </span>
    );
  }
  if (diff > 0) {
    // ELO ranks lower (worse) than FIFA → team performs better in FIFA
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium" title="Higher in ELO than FIFA">
        <TrendingUp size={12} className="rotate-180" /> +{abs}
      </span>
    );
  }
  // diff < 0 → ELO ranks higher (better) than FIFA
  return (
    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium" title="Higher in FIFA than ELO">
      <TrendingUp size={12} /> -{abs}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Scatter Plot                                                        */
/* ------------------------------------------------------------------ */
const CONF_COLORS: Record<string, string> = {
  UEFA: "#3b82f6",
  CONMEBOL: "#22c55e",
  CONCACAF: "#f59e0b",
  CAF: "#ef4444",
  AFC: "#8b5cf6",
  OFC: "#06b6d4",
};

function ScatterPlot({ data }: { data: ComparisonEntry[] }) {
  const W = 600;
  const H = 400;
  const PAD = { top: 20, right: 20, bottom: 45, left: 55 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;

  if (data.length === 0) return null;

  const maxFifa = Math.max(...data.map((d) => d.fifa_rank)) + 2;
  const minElo = Math.min(...data.map((d) => d.elo_rating)) - 20;
  const maxElo = Math.max(...data.map((d) => d.elo_rating)) + 20;

  const xScale = (r: number) => PAD.left + ((r - 1) / Math.max(maxFifa - 1, 1)) * iw;
  const yScale = (r: number) => PAD.top + ih - ((r - minElo) / Math.max(maxElo - minElo, 1)) * ih;

  // Axis ticks
  const xTicks = [1, Math.round(maxFifa / 4), Math.round(maxFifa / 2), Math.round((3 * maxFifa) / 4), maxFifa];
  const yTicks = [minElo, Math.round((minElo + maxElo) / 2), maxElo];

  const [tooltip, setTooltip] = useState<{ x: number; y: number; entry: ComparisonEntry } | null>(null);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H + 30}`} className="w-full max-w-2xl mx-auto" style={{ fontFamily: "monospace" }}>
        {/* Grid lines */}
        {xTicks.map((t) => (
          <line key={`xg-${t}`} x1={xScale(t)} y1={PAD.top} x2={xScale(t)} y2={PAD.top + ih} stroke="#f0f0f0" strokeWidth={1} />
        ))}
        {yTicks.map((t) => (
          <line key={`yg-${t}`} x1={PAD.left} y1={yScale(t)} x2={PAD.left + iw} y2={yScale(t)} stroke="#f0f0f0" strokeWidth={1} />
        ))}

        {/* Axes */}
        <line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={PAD.top + ih} stroke="#d1d5db" strokeWidth={1.5} />
        <line x1={PAD.left} y1={PAD.top + ih} x2={PAD.left + iw} y2={PAD.top + ih} stroke="#d1d5db" strokeWidth={1.5} />

        {/* X ticks */}
        {xTicks.map((t) => (
          <g key={`xt-${t}`}>
            <line x1={xScale(t)} y1={PAD.top + ih} x2={xScale(t)} y2={PAD.top + ih + 5} stroke="#9ca3af" strokeWidth={1} />
            <text x={xScale(t)} y={PAD.top + ih + 18} textAnchor="middle" fill="#9ca3af" fontSize={10}>
              #{t}
            </text>
          </g>
        ))}

        {/* Y ticks */}
        {yTicks.map((t) => (
          <g key={`yt-${t}`}>
            <line x1={PAD.left - 5} y1={yScale(t)} x2={PAD.left} y2={yScale(t)} stroke="#9ca3af" strokeWidth={1} />
            <text x={PAD.left - 10} y={yScale(t) + 3} textAnchor="end" fill="#9ca3af" fontSize={10}>
              {t}
            </text>
          </g>
        ))}

        {/* Axis labels */}
        <text x={PAD.left + iw / 2} y={H - 5} textAnchor="middle" fill="#6b7280" fontSize={11} fontWeight={600}>
          FIFA Rank →
        </text>
        <text
          x={12}
          y={PAD.top + ih / 2}
          textAnchor="middle"
          fill="#6b7280"
          fontSize={11}
          fontWeight={600}
          transform={`rotate(-90, 12, ${PAD.top + ih / 2})`}
        >
          ELO Rating →
        </text>

        {/* Dots */}
        {data.map((entry) => {
          const cx = xScale(entry.fifa_rank);
          const cy = yScale(entry.elo_rating);
          const color = CONF_COLORS[entry.confederation] || "#9ca3af";
          return (
            <circle
              key={entry.team}
              cx={cx}
              cy={cy}
              r={5}
              fill={color}
              fillOpacity={0.7}
              stroke="white"
              strokeWidth={1}
              className="cursor-pointer transition-opacity hover:opacity-100"
              opacity={0.75}
              onMouseEnter={() => setTooltip({ x: cx, y: cy, entry })}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}

        {/* Trend line (linear regression approximated) */}
        {data.length > 2 && (() => {
          const n = data.length;
          const sx = data.reduce((a, d) => a + d.fifa_rank, 0);
          const sy = data.reduce((a, d) => a + d.elo_rating, 0);
          const sxy = data.reduce((a, d) => a + d.fifa_rank * d.elo_rating, 0);
          const sx2 = data.reduce((a, d) => a + d.fifa_rank ** 2, 0);
          const slope = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
          const intercept = (sy - slope * sx) / n;
          const x1 = 1;
          const x2 = maxFifa;
          return (
            <line
              x1={xScale(x1)} y1={yScale(slope * x1 + intercept)}
              x2={xScale(x2)} y2={yScale(slope * x2 + intercept)}
              stroke="#ef4444"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.5}
            />
          );
        })()}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs pointer-events-none"
          style={{
            left: Math.min(tooltip.x + 10, 500),
            top: Math.max(tooltip.y - 40, 0),
          }}
        >
          <p className="font-semibold text-gray-800 flex items-center gap-1">
            <CountryFlag country={tooltip.entry.team} size={14} />
            {tooltip.entry.team}
          </p>
          <p className="text-gray-500">FIFA: #{tooltip.entry.fifa_rank} · ELO: {tooltip.entry.elo_rating}</p>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-2 text-xs text-gray-500">
        {Object.entries(CONF_COLORS).map(([conf, color]) => (
          <span key={conf} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
            {conf}
          </span>
        ))}
        <span className="flex items-center gap-1 ml-2">
          <span className="w-4 h-0 border-b border-dashed border-red-400 inline-block" />
          Trend
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export function RankingComparisonClient() {
  const [topN, setTopN] = useState(30);
  const [search, setSearch] = useState("");
  const [confFilter, setConfFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState<"fifa" | "elo" | "diff">("fifa");

  const { data, loading, error } = useComparison(topN);

  const confederations = ["ALL", "UEFA", "CONMEBOL", "CONCACAF", "CAF", "AFC", "OFC"];

  let rows = data?.comparison ?? [];
  if (confFilter !== "ALL") {
    rows = rows.filter((r) => r.confederation === confFilter);
  }
  if (search) {
    rows = rows.filter((r) => r.team.toLowerCase().includes(search.toLowerCase()));
  }

  // Sort
  if (sortBy === "fifa") rows.sort((a, b) => a.fifa_rank - b.fifa_rank);
  else if (sortBy === "elo") rows.sort((a, b) => a.elo_rank - b.elo_rank);
  else if (sortBy === "diff") rows.sort((a, b) => Math.abs(b.rank_difference) - Math.abs(a.rank_difference));

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <div className="text-xs text-blue-700 space-y-1">
            <p className="font-semibold">How to read this comparison</p>
            <p>
              <span className="text-green-600 font-medium">Negative diff</span> = team ranks <strong>better in ELO</strong> than FIFA.
              <span className="text-amber-600 font-medium ml-3">Positive diff</span> = team ranks <strong>better in FIFA</strong> than ELO.
              Zero = equal ranking in both systems.
            </p>
          </div>
        </div>
      </div>

      {/* Scatter Plot */}
      {!loading && rows.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <ScatterChart size={14} /> Correlation: FIFA Rank vs ELO Rating
          </h3>
          <ScatterPlot data={rows} />
        </section>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <select
            value={topN}
            onChange={(e) => setTopN(Number(e.target.value))}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:ring-1 focus:ring-blue-400"
          >
            {[10, 20, 30, 50, 100].map((n) => <option key={n} value={n}>Top {n}</option>)}
          </select>
          <select
            value={confFilter}
            onChange={(e) => setConfFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:ring-1 focus:ring-blue-400"
          >
            {confederations.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 bg-white focus:ring-1 focus:ring-blue-400"
          >
            <option value="fifa">Sort by FIFA rank</option>
            <option value="elo">Sort by ELO rank</option>
            <option value="diff">Biggest difference</option>
          </select>
          {data?.comparison && (
            <DownloadButton
              data={data.comparison as unknown as Record<string, unknown>[]}
              filename={`fifa-vs-elo-${data.fifa_snapshot_date}`}
              label="CSV"
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <Search size={14} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search team…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 w-48 text-gray-600 focus:ring-1 focus:ring-blue-400 focus:outline-none"
          />
        </div>
      </div>

      {/* Table */}
      <section className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading && (
          <div className="p-12 text-center text-sm text-gray-400 animate-pulse">
            Loading comparison data…
          </div>
        )}
        {error && (
          <div className="p-12 text-center text-sm text-red-500 flex items-center justify-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Team</th>
                  <th className="text-center px-4 py-3 font-medium">Conf.</th>
                  <th className="text-right px-4 py-3 font-medium">
                    <span className="flex items-center justify-end gap-1">
                      <Trophy size={12} className="text-amber-500" /> FIFA Rank
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium">FIFA Pts</th>
                  <th className="text-right px-4 py-3 font-medium">
                    <span className="flex items-center justify-end gap-1">
                      <TrendingUp size={12} className="text-violet-500" /> ELO Rank
                    </span>
                  </th>
                  <th className="text-right px-4 py-3 font-medium">ELO Rating</th>
                  <th className="text-center px-4 py-3 font-medium">Diff</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((entry) => {
                  const diff = entry.rank_difference;
                  const isBetterInElo = diff < 0;
                  const isBetterInFifa = diff > 0;
                  return (
                    <tr
                      key={entry.team}
                      className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${
                        isBetterInElo ? "bg-green-50/30" : isBetterInFifa ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <CountryFlag country={entry.team} size={16} />
                          <span className="font-medium text-gray-700">{entry.team}</span>
                          <span className="text-[10px] text-gray-400 uppercase">({entry.country_abrv})</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                          {entry.confederation}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-amber-700">
                        #{entry.fifa_rank}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500 text-xs">
                        {entry.fifa_points}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-violet-700">
                        #{entry.elo_rank}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-500 text-xs">
                        {entry.elo_rating}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <DiffBadge diff={diff} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-400">No results match your filters.</div>
            )}
          </div>
        )}
      </section>

      {/* Stats footer */}
      {data && !loading && (
        <div className="text-xs text-gray-400 text-center">
          Comparing top {topN} FIFA-ranked countries against ELO ratings.
          FIFA snapshot: {data.fifa_snapshot_date} — ELO calculated through: {data.elo_calculation_date}
        </div>
      )}
    </div>
  );
}
