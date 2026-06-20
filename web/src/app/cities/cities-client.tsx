"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  const sp = useSearchParams();
  const params = useMemo(() => ({
    tournaments: sp.get("tournaments") || "",
    countries: sp.get("countries") || "",
    date_from: sp.get("date_from") || "",
    date_to: sp.get("date_to") || "",
  }), [sp]);
  const [cities, setCities] = useState<CityListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const fq = buildFilterQs(params);
      const res = await fetch(`${API}/cities${fq ? "?" + fq : ""}`).then((r) => r.json());
      setCities(res);
    } catch (err) {
      console.error("Failed to load cities:", err);
    }
    setLoading(false);
  }, [params.tournaments, params.countries, params.date_from, params.date_to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div>
        <h1 className="page-title mb-2">Cities</h1>
        <p className="text-[14px] text-[#6C757D] mb-4">Loading...</p>
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
          <img src={getFlagUrl(c.country, 24)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
          <span>{c.country}</span>
        </div>
      ),
    },
    { key: "matches", header: "Matches", sortable: true, render: (c: CityListItem) => formatNumber(c.matches) },
    { key: "goals", header: "Goals", sortable: true, render: (c: CityListItem) => formatNumber(c.goals) },
    { key: "tournaments", header: "Tournaments", sortable: true },
  ];

  return (
    <div>
      <h1 className="page-title mb-2">Cities</h1>
      <p className="text-[14px] text-[#6C757D] mb-4">
        {cities.length} cities where international matches have been played.
      </p>
      <FilterBar showTournaments showCountries showDateRange />
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
