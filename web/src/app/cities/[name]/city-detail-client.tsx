"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { StatsCard } from "@/components/shared/StatsCard";
import { FilterBar } from "@/components/shared/FilterBar";
import { TopList } from "@/components/shared/TopList";
import { formatNumber, getFlagUrl } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import type { CityDetail } from "@/lib/types";

const API = "/api/proxy";

function buildFilterQs(params: { tournaments: string; countries: string; date_from: string; date_to: string }): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function CityDetailClient({ name }: { name: string }) {
  const searchParams = useSearchParams();
  const tournaments = searchParams.get("tournaments") || "";
  const countries = searchParams.get("countries") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const [data, setData] = useState<CityDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
    const fq = buildFilterQs(params);

    async function load() {
      if (!cancelled) setLoading(true);
      try {
        const res = await fetch(`${API}/city/${encodeURIComponent(name)}${fq ? "?" + fq : ""}`).then((r) => r.json());
        if (!cancelled) {
          setData(res);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) setLoading(false);
        console.error("Failed to load city:", err);
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
        <Link href="/cities" className="text-[14px] text-[#1A56DB] hover:underline flex items-center gap-1 mb-4">
          <ArrowLeft size={14} /> Back to Cities
        </Link>
        <h1 className="page-title mb-2">City Not Found</h1>
        <p className="text-[14px] text-[#6C757D]">No data for &quot;{name}&quot;.</p>
      </div>
    );
  }

  const s = data.summary;

  const topTeams = (s.top_teams_by_wins || [])
    .slice(0, 10)
    .map((t, i) => ({
      rank: i + 1,
      name: t.team,
      value: formatNumber(t.wins),
      href: `/teams/${encodeURIComponent(t.team)}`,
    }));

  const topTournaments = (s.top_tournaments || [])
    .slice(0, 10)
    .map((t, i) => ({
      rank: i + 1,
      name: t.tournament,
      value: formatNumber(t.matches),
      href: `/tournaments/${encodeURIComponent(t.tournament)}`,
    }));

  return (
    <div>
      <Link href="/cities" className="text-[14px] text-[#1A56DB] hover:underline flex items-center gap-1 mb-1">
        <ArrowLeft size={14} /> Back to Cities
      </Link>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="page-title">{data.city}</h1>
        {data.country && (
          <div className="flex items-center gap-1.5 text-[14px] text-[#6C757D]">
            <img src={getFlagUrl(data.country, 24)} alt="" className="w-5 h-3.5 object-cover rounded-sm" />
            <Link href={`/countries/${encodeURIComponent(data.country)}`} className="hover:text-[#1A56DB]">
              {data.country}
            </Link>
          </div>
        )}
      </div>
      <p className="text-[14px] text-[#6C757D] mb-6">
        {s.unique_tournaments} tournaments · {formatNumber(s.matches)} matches · {formatNumber(s.total_goals)} goals
      </p>

      <FilterBar showTournaments showCountries showDateRange />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Matches" value={formatNumber(s.matches)} />
        <StatsCard label="Goals" value={formatNumber(s.total_goals)} sub={`${s.avg_goals_per_match.toFixed(2)} avg/match`} />
        <StatsCard label="Tournaments" value={s.unique_tournaments} />
        <StatsCard label="Unique Teams" value={s.unique_teams} />
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <TopList title="👥 Top Teams" items={topTeams} maxValue={s.top_teams_by_wins?.[0]?.wins || 1} />
        <TopList title="🏆 Top Tournaments" items={topTournaments} maxValue={s.top_tournaments?.[0]?.matches || 1} />
      </div>
    </div>
  );
}
