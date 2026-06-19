"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { FilterBar } from "@/components/shared/FilterBar";
import { formatNumber } from "@/lib/utils";
import { Trophy, Calendar, Users, Target } from "lucide-react";
import type { TournamentListItem } from "@/lib/types";

const API = "/api/proxy";

function useQueryParams() {
  const sp = useSearchParams();
  return {
    tournaments: sp.get("tournaments") || "",
    countries: sp.get("countries") || "",
    date_from: sp.get("date_from") || "",
    date_to: sp.get("date_to") || "",
  };
}

function buildFilterQs(params: ReturnType<typeof useQueryParams>): string {
  const q = new URLSearchParams();
  if (params.tournaments) q.set("tournaments", params.tournaments);
  if (params.countries) q.set("countries", params.countries);
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return q.toString();
}

export function TournamentsClient() {
  const params = useQueryParams();
  const [tournaments, setTournaments] = useState<TournamentListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const fq = buildFilterQs(params);
      const res = await fetch(`${API}/tournaments${fq ? "?" + fq : ""}`).then((r) => r.json());
      setTournaments(res);
    } catch (err) {
      console.error("Failed to load tournaments:", err);
    }
    setLoading(false);
  }, [params.tournaments, params.countries, params.date_from, params.date_to]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div>
        <h1 className="page-title mb-2">Tournaments</h1>
        <p className="text-[14px] text-[#6C757D] mb-4">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title mb-2">Tournaments</h1>
      <p className="text-[14px] text-[#6C757D] mb-4">
        {tournaments.length} tournaments. Click a card to view details.
      </p>
      <FilterBar showTournaments showCountries showDateRange />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tournaments.map((t) => (
          <Link key={t.tournament} href={`/tournaments/${encodeURIComponent(t.tournament)}`}>
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
                  ⚽ {formatNumber(t.goals)} goals
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-[#6C757D]">
                  <Users size={13} /> {t.teams} teams
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
