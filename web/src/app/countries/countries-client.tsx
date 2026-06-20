"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { formatNumber, getFlagUrl } from "@/lib/utils";
import type { CountryListItem } from "@/lib/types";

const API = "/api/proxy";


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

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
    const fq = buildFilterQs(params);

    async function load() {
      if (!cancelled) setLoading(true);
      try {
        const res = await fetch(`${API}/countries${fq ? "?" + fq : ""}`, { signal: controller.signal }).then((r) => r.json());
        if (!cancelled) {
          setCountryList(res);
          setLoading(false);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        if (!cancelled) setLoading(false);
        console.error("Failed to load countries:", err);
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
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

  const columns = [
    { key: "_rank", header: "#", render: (_: CountryListItem, idx: number) => idx + 1, className: "w-12" },
    {
      key: "country", header: "Country", sortable: true,
      render: (c: CountryListItem) => (
        <div className="flex items-center gap-2">
          <img src={getFlagUrl(c.country, 24)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
          <span>{c.country}</span>
        </div>
      ),
    },
    { key: "matches", header: "Matches", sortable: true, render: (c: CountryListItem) => formatNumber(c.matches) },
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
      <FilterBar showTournaments showCountries showDateRange />
      <DataTable
        columns={columns}
        data={countryList}
        keyField="country"
        defaultSort={{ key: "matches", dir: "desc" }}
        onRowClick={(c) => router.push(`/countries/${encodeURIComponent(c.country)}`)}
      />
    </div>
  );
}
