"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { FilterBar } from "@/components/shared/FilterBar";
import { formatNumber } from "@/lib/utils";
import { useFilterHref } from "@/lib/use-filter-href";
import { Trophy, Calendar, Users, Target } from "lucide-react";
import type { TournamentListItem } from "@/lib/types";

const API = "/api/proxy";

const SORTS = [
  { key: "name", label: "Name" },
  { key: "matches", label: "Matches" },
  { key: "editions", label: "Editions" },
  { key: "first_year", label: "First Year" },
  { key: "total_goals", label: "Goals" },
  { key: "unique_teams", label: "Teams" },
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

export function TournamentsClient() {
  const searchParams = useSearchParams();
  const to = useFilterHref();
  const tournaments = searchParams.get("tournaments") || "";
  const countries = searchParams.get("countries") || "";
  const dateFrom = searchParams.get("date_from") || "";
  const dateTo = searchParams.get("date_to") || "";
  const [tournamentList, setTournamentList] = useState<TournamentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {

    const controller = new AbortController();
    const params = { tournaments, countries, date_from: dateFrom, date_to: dateTo };
    const fq = buildFilterQs(params);

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API}/tournaments${fq ? "?" + fq : ""}`, { signal: controller.signal }).then((r) => r.json());
        setTournamentList(res);
        setLoading(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setLoading(false);
        console.error("Failed to load tournaments:", err);
      }
    }

    load();
    return () => { controller.abort(); };
  }, [tournaments, countries, dateFrom, dateTo]);

  if (loading) {
    return (
      <div>
        <div className="skeleton h-10 w-48 mb-2 rounded" />
        <div className="skeleton h-5 w-64 mb-4 rounded" />
        <div className="skeleton h-[52px] mb-6 rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="card p-5">
              <div className="skeleton h-5 w-32 mb-3 rounded" />
              <div className="skeleton h-4 w-24 mb-2 rounded" />
              <div className="skeleton h-4 w-20 mb-2 rounded" />
              <div className="skeleton h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const sorted = [...tournamentList].sort((a, b) => {
    let cmp: number;
    if (sortBy === "name") {
      cmp = a.tournament.localeCompare(b.tournament);
    } else {
      const lookup: Record<Exclude<SortKey, "name">, (item: TournamentListItem) => number> = {
        matches: (x) => x.matches,
        editions: (x) => x.editions,
        first_year: (x) => x.first_year,
        total_goals: (x) => x.total_goals,
        unique_teams: (x) => x.unique_teams,
      };
      cmp = lookup[sortBy](a) - lookup[sortBy](b);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  return (
    <div>
      <h1 className="page-title mb-2">Tournaments</h1>
      <p className="text-[14px] text-[#6C757D] mb-4">
        {tournamentList.length} tournaments. Click a card to view details.
      </p>
      <FilterBar showCountries showDateRange />

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((t) => (
          <Link key={t.tournament} href={to(`/tournaments/${encodeURIComponent(t.tournament)}`)}>
            <div className="card p-5 hover:shadow-md hover:border-[#1A56DB] transition-all cursor-pointer h-full">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={18} className="text-[#FD7E14]" />
                <h3 className="text-[15px] font-semibold text-[#212529]">{t.tournament}</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-1.5 text-[13px] text-[#6C757D]">
                  <Calendar size={13} /> {t.first_year} – {t.last_year}
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-[#6C757D]">
                  <Target size={13} /> {formatNumber(t.matches)} matches
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-[#6C757D]">
                  ⚽ {formatNumber(t.total_goals)} goals
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-[#6C757D]">
                  <Users size={13} /> {t.unique_teams} teams
                </div>
              </div>
              <div className="mt-2 text-[13px] text-[#1A56DB] font-medium">View Details →</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
