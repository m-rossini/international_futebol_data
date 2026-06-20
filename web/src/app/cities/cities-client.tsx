"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTable } from "@/components/shared/DataTable";
import { formatNumber, getFlagUrl } from "@/lib/utils";
import type { CityListItem } from "@/lib/types";

const API = "/api/proxy";


function buildFilterQs(params: { tournaments: string; countries: string; date_from: string; date_to: string }): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function CitiesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tournaments = searchParams.get("tournaments") || "";
  const countries = searchParams.get("countries") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const [cities, setCities] = useState<CityListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
    const fq = buildFilterQs(params);

    async function load() {
      if (!cancelled) setLoading(true);
      try {
        const res = await fetch(`${API}/cities${fq ? "?" + fq : ""}`).then((r) => r.json());
        if (!cancelled) {
          setCities(res);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) setLoading(false);
        console.error("Failed to load cities:", err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tournaments, countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div>
        <div className="skeleton h-10 w-32 mb-2 rounded" />
        <div className="skeleton h-5 w-64 mb-4 rounded" />
        <div className="skeleton h-[52px] mb-6 rounded" />
        <div className="card p-5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 mb-3">
              <div className="skeleton h-4 w-6 rounded" />
              <div className="skeleton h-5 w-32 rounded" />
              <div className="skeleton h-5 w-24 rounded" />
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
    { key: "_rank", header: "#", render: (_: CityListItem, idx: number) => idx + 1, className: "w-12" },
    { key: "city", header: "City", sortable: true },
    {
      key: "country", header: "Country", sortable: true,
      render: (c: CityListItem) => (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={getFlagUrl(c.country, 24)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
          <span>{c.country}</span>
        </div>
      ),
    },
    { key: "matches", header: "Matches", sortable: true, render: (c: CityListItem) => formatNumber(c.matches) },
    { key: "total_goals", header: "Goals", sortable: true, render: (c: CityListItem) => formatNumber(c.total_goals) },
    { key: "tournaments", header: "Tournaments", sortable: true, render: (c: CityListItem) => formatNumber(c.tournaments) },
  ];

  return (
    <div>
      <h1 className="page-title mb-2">Cities</h1>
      <p className="text-[14px] text-[#6C757D] mb-4">
        {cities.length} cities where international matches have been played.
      </p>
      <FilterBar showCountries showDateRange />
      <DataTable
        columns={columns}
        data={cities}
        keyField="city"
        defaultSort={{ key: "matches", dir: "desc" }}
        onRowClick={(c) => router.push(`/cities/${encodeURIComponent(c.city)}`)}
      />
    </div>
  );
}
