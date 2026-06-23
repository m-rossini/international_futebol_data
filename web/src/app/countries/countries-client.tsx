"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { formatNumber, getFlagUrl, winRateClass } from "@/lib/utils";
import type { CountryListItem } from "@/lib/types";

const API = "/api/proxy";

const SORTS = [
  { key: "matches", label: "Matches" },
  { key: "win_rate", label: "Win Rate" },
  { key: "loss_rate", label: "Loss Rate" },
  { key: "total_goals", label: "Goals" },
  { key: "cities", label: "Cities" },
  { key: "first_year", label: "First Year" },
  { key: "last_year", label: "Last Year" },
];

type SortKey = (typeof SORTS)[number]["key"];

function buildFilterQs(params: { tournaments: string; countries: string; date_from: string; date_to: string }): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function CountriesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournaments = searchParams.get("tournaments") || "";
  const countries = searchParams.get("countries") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const [countryList, setCountryList] = useState<CountryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("matches");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    let cancelled = false;
    const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
    const fq = buildFilterQs(params);

    async function load() {
      if (!cancelled) setLoading(true);
      try {
        const res = await fetch(`${API}/countries${fq ? "?" + fq : ""}`).then((r) => r.json());
        if (!cancelled) {
          setCountryList(res);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) setLoading(false);
        console.error("Failed to load countries:", err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tournaments, countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div>
        <div className="skeleton h-10 w-40 mb-2 rounded" />
        <div className="skeleton h-5 w-64 mb-4 rounded" />
        <div className="skeleton h-[52px] mb-6 rounded" />
        <div className="card p-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 mb-3">
              <div className="skeleton h-4 w-6 rounded" />
              <div className="skeleton h-5 w-5 rounded-sm" />
              <div className="skeleton h-5 w-32 rounded" />
              <div className="skeleton h-4 w-16 rounded ml-auto" />
              <div className="skeleton h-4 w-16 rounded" />
              <div className="skeleton h-4 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sorted = [...countryList].sort((a, b) => {
    let cmp: number;
    if (sortBy === "matches" || sortBy === "total_goals" || sortBy === "cities" ||
        sortBy === "first_year" || sortBy === "last_year") {
      cmp = a[sortBy] - b[sortBy];
    } else {
      cmp = a[sortBy] - b[sortBy];
    }
    if (Number.isNaN(cmp)) cmp = 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const columns = [
    { key: "_rank", header: "#", render: (_: CountryListItem, idx: number) => idx + 1, className: "w-12" },
    {
      key: "country", header: "Country", sortable: true,
      render: (c: CountryListItem) => (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getFlagUrl(c.country, 24)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
          <span>{c.country}</span>
        </div>
      ),
    },
    { key: "matches", header: "Matches", sortable: true, render: (c: CountryListItem) => formatNumber(c.matches) },
    {
      key: "win_rate", header: "Win Rate", sortable: true,
      render: (c: CountryListItem) => (
        <span className={`badge ${winRateClass(c.win_rate)}`}>{c.win_rate.toFixed(1)}%</span>
      ),
    },
    {
      key: "loss_rate", header: "Loss Rate", sortable: true,
      render: (c: CountryListItem) => (
        <span className="text-[13px] text-[#6C757D]">{c.loss_rate.toFixed(1)}%</span>
      ),
    },
    { key: "total_goals", header: "Goals", sortable: true, render: (c: CountryListItem) => formatNumber(c.total_goals) },
    { key: "cities", header: "Cities", sortable: true },
    { key: "first_year", header: "First Year", sortable: true },
    { key: "last_year", header: "Last Year", sortable: true },
  ];

  return (
    <div>
      <h1 className="page-title mb-2">Countries</h1>
      <p className="text-[14px] text-[#6C757D] mb-4">
        {countryList.length} countries where matches have been hosted.
      </p>
      <FilterBar showTournaments showCountries={false} showDateRange />

      {/* Sort controls */}
      <div className="card p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-[13px] font-semibold text-[#6C757D]">Sort by:</span>
          <div className="flex gap-1 flex-wrap">
            {SORTS.map((s) => (
              <button
                key={s.key}
                onClick={() => {
                  if (sortBy === s.key) {
                    setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                  } else {
                    setSortBy(s.key);
                    setSortDir("desc");
                  }
                }}
                className={`chip ${sortBy === s.key ? "active" : ""}`}
              >
                {s.label} {sortBy === s.key && (sortDir === "asc" ? "↑" : "↓")}
              </button>
            ))}
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={sorted}
        keyField="country"
        defaultSort={{ key: "matches", dir: "desc" }}
        onRowClick={(c) => router.push(`/countries/${encodeURIComponent(c.country)}`)}
      />
    </div>
  );
}
