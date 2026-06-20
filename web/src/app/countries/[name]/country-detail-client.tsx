"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { StatsCard } from "@/components/shared/StatsCard";
import { FilterBar } from "@/components/shared/FilterBar";
import { TopList } from "@/components/shared/TopList";
import { formatNumber } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { CountryDetail } from "@/lib/types";

const API = "/api/proxy";


function buildFilterQs(params: { tournaments: string; countries: string; date_from: string; date_to: string }): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function CountryDetailClient({ name }: { name: string }) {
  const searchParams = useSearchParams();
  const tournaments = searchParams.get("tournaments") || "";
  const countries = searchParams.get("countries") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const [data, setData] = useState<CountryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
    const fq = buildFilterQs(params);

    async function load() {
      if (!cancelled) setLoading(true);
      try {
        const res = await fetch(`${API}/country/${encodeURIComponent(name)}${fq ? "?" + fq : ""}`).then((r) => r.json());
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) setLoading(false);
        console.error("Failed to load country:", err);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [name, tournaments, countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div>
        <div className="skeleton h-8 w-48 mb-2 rounded" />
        <div className="skeleton h-5 w-32 mb-6 rounded" />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Link href="/countries" className="text-[14px] text-[#1A56DB] hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to Countries
        </Link>
        <h1 className="page-title mb-2">Country Not Found</h1>
        <p className="text-[14px] text-[#6C757D]">No data for &quot;{name}&quot;.</p>
      </div>
    );
  }

  const topTournaments = Object.entries(data.top_tournaments)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([t, val], i) => ({
      rank: i + 1,
      name: t,
      value: formatNumber(val),
      href: `/tournaments/${encodeURIComponent(t)}`,
    }));

  const topCities = Object.entries(data.top_cities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([c, val], i) => ({
      rank: i + 1,
      name: c,
      value: formatNumber(val),
      href: `/cities/${encodeURIComponent(c)}`,
    }));

  const topTeams = Object.entries(data.top_teams)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([t, val], i) => ({
      rank: i + 1,
      name: t,
      value: formatNumber(val),
      href: `/teams/${encodeURIComponent(t)}`,
    }));

  return (
    <div>
      <Link href="/countries" className="text-[14px] text-[#1A56DB] hover:underline flex items-center gap-1 mb-1">
        <ArrowLeft size={14} /> Back to Countries
      </Link>
      <h1 className="page-title mb-1">{data.country}</h1>
      <p className="text-[14px] text-[#6C757D] mb-6">
        {data.cities} cities · {formatNumber(data.matches)} matches · {formatNumber(data.goals)} goals
      </p>

      <FilterBar showTournaments showCountries showDateRange />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <StatsCard label="Matches" value={formatNumber(data.matches)} />
        <StatsCard label="Goals" value={formatNumber(data.goals)} />
        <StatsCard label="Cities" value={data.cities} />
        <StatsCard label="First Match" value={data.first_match} />
        <StatsCard label="Last Match" value={data.last_match} />
        {data.biggest_win && (
          <StatsCard label="Biggest Win" value={data.biggest_win.score} sub={`${data.biggest_win.teams} · ${data.biggest_win.date}`} />
        )}
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <TopList title="🏆 Top Tournaments" items={topTournaments} maxValue={topTournaments[0] ? Number(topTournaments[0].value) : 1} />
        <TopList title="🏙️ Top Cities" items={topCities} maxValue={topCities[0] ? Number(topCities[0].value) : 1} />
        <TopList title="👥 Top Teams" items={topTeams} maxValue={topTeams[0] ? Number(topTeams[0].value) : 1} />
      </div>
    </div>
  );
}
