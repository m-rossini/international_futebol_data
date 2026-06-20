"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { formatNumber } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { GoalsPerYearItem } from "@/lib/types";

const API = "/api/proxy";

const SORT_OPTIONS = [
  { value: "goals", label: "Goals" },
  { value: "matches", label: "Matches" },
  { value: "ratio", label: "Avg/Game" },
];


function buildFilterQs(params: { tournaments: string; countries: string; date_from: string; date_to: string }): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function GoalsPerYearClient() {
  const searchParams = useSearchParams();
  const tournaments = searchParams.get("tournaments") || "";
  const countries = searchParams.get("countries") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const [sortBy, setSortBy] = useState(searchParams.get("sort_by") || "goals");
  const [order, setOrder] = useState(searchParams.get("order") || "desc");
  const [data, setData] = useState<GoalsPerYearItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
    const fq = buildFilterQs(params);
    const qs = `sort_by=${sortBy}&order=${order}${fq ? "&" + fq : ""}`;

    async function load() {
      if (!cancelled) setLoading(true);
      try {
        const res = await fetch(`${API}/goals_per_year?${qs}`).then((r) => r.json());
        if (!cancelled) {
          // API returns avg_goals, frontend uses ratio
          const normalized = (res as Array<Record<string, unknown>>).map((item) => ({
            ...item,
            ratio: Number(item.avg_goals ?? 0),
          })) as GoalsPerYearItem[];
          setData(normalized);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) setLoading(false);
        console.error("Failed to load goals per year:", err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [sortBy, order, tournaments, countries, dateFrom, dateTo]);

  const sortedChart = [...data].sort((a, b) => a.year - b.year);
  const maxGoals = sortedChart.length > 0 ? Math.max(...sortedChart.map((d) => d.goals)) : 1;

  const columns = [
    { key: "year", header: "Year", sortable: true },
    { key: "goals", header: "Goals", sortable: true, render: (d: GoalsPerYearItem) => formatNumber(d.goals) },
    { key: "matches", header: "Matches", sortable: true, render: (d: GoalsPerYearItem) => formatNumber(d.matches) },
    { key: "ratio", header: "Avg/Game", sortable: true, render: (d: GoalsPerYearItem) => d.ratio.toFixed(2) },
  ];

  return (
    <div>
      <h1 className="page-title mb-2">Goals Per Year</h1>
      <p className="text-[14px] text-[#6C757D] mb-4">
        Goals, matches, and average goals per game by year. Use filters to narrow scope.
      </p>

      <FilterBar showTournaments showCountries showDateRange />

      {/* Controls */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#6C757D]">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-[#E9ECEF] rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:border-[#1A56DB]"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-[#6C757D]">Order:</span>
            <button
              onClick={() => setOrder("desc")}
              className={`chip ${order === "desc" ? "active" : ""}`}
            >
              <TrendingDown size={12} className="inline mr-1" /> Desc
            </button>
            <button
              onClick={() => setOrder("asc")}
              className={`chip ${order === "asc" ? "active" : ""}`}
            >
              <TrendingUp size={12} className="inline mr-1" /> Asc
            </button>
          </div>
        </div>
      </div>

      {/* Chart */}
      {!loading && sortedChart.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="section-title mb-4">
            {sortBy === "goals" ? "📈" : sortBy === "ratio" ? "📊" : "📅"}{" "}
            {SORT_OPTIONS.find((s) => s.value === sortBy)?.label} Over Time
          </h3>
          <div className="h-[260px] flex items-end gap-[2px] px-4 pb-2">
            {sortedChart.map((d) => {
              const val = sortBy === "goals" ? d.goals : sortBy === "matches" ? d.matches : d.ratio;
              const maxVal = sortBy === "goals" ? maxGoals :
                sortBy === "matches" ? Math.max(...sortedChart.map((x) => x.matches)) :
                Math.max(...sortedChart.map((x) => x.ratio));
              const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
              return (
                <div
                  key={d.year}
                  className="bg-[#1A56DB] rounded-t-sm flex-1 hover:bg-[#0D3B9E] transition-colors"
                  style={{ height: `${Math.max(pct, 0.5)}%`, opacity: 0.5 + pct / 200 }}
                  title={`${d.year}: ${formatNumber(d.goals)} goals (${formatNumber(d.matches)} matches, ${d.ratio.toFixed(2)} avg)`}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[11px] text-[#ADB5BD]">
            <span>{sortedChart[0]?.year}</span>
            <span>{sortedChart[sortedChart.length - 1]?.year}</span>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="card p-5">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 mb-3">
              <div className="skeleton h-4 w-12 rounded" />
              <div className="skeleton h-4 w-16 rounded" />
              <div className="skeleton h-4 w-16 rounded" />
              <div className="skeleton h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={data}
          keyField="year"
          defaultSort={{ key: sortBy, dir: order as "asc" | "desc" }}
        />
      )}
    </div>
  );
}
