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
        <h1 className="page-title mb-2">Countries</h1>
        <p className="text-[14px] text-[#6C757D] mb-4">Loading...</p>
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
    { key: "goals", header: "Goals", sortable: true, render: (c: CountryListItem) => formatNumber(c.goals) },
    { key: "cities", header: "Cities", sortable: true },
    { key: "first_match", header: "First Match", sortable: true, className: "text-[13px] text-[#6C757D]" },
    { key: "last_match", header: "Last Match", sortable: true, className: "text-[13px] text-[#6C757D]" },
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
