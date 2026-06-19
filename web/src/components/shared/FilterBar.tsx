"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";

interface FilterBarProps {
  showTournaments?: boolean;
  showCountries?: boolean;
  showDateRange?: boolean;
}

export function FilterBar({
  showTournaments = true,
  showCountries = true,
  showDateRange = true,
}: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [tournaments, setTournaments] = useState(searchParams.get("tournaments") || "");
  const [countries, setCountries] = useState(searchParams.get("countries") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");

  const activeCount = [tournaments, countries, dateFrom, dateTo].filter(Boolean).length;

  const apply = useCallback(() => {
    const params = new URLSearchParams();
    if (tournaments.trim()) params.set("tournaments", tournaments.trim());
    if (countries.trim()) params.set("countries", countries.trim());
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, tournaments, countries, dateFrom, dateTo]);

  const clear = useCallback(() => {
    setTournaments("");
    setCountries("");
    setDateFrom("");
    setDateTo("");
    router.push(pathname);
  }, [router, pathname]);

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[13px] font-semibold text-[#6C757D]">Filters:</span>
        {showTournaments && (
          <input
            type="text"
            className="border border-[#E9ECEF] rounded-lg px-3 py-2 text-[14px] w-[220px] focus:outline-none focus:border-[#1A56DB] focus:shadow-[0_0_0_3px_#E8F0FE]"
            placeholder="Tournaments (e.g. FIFA World Cup)"
            value={tournaments}
            onChange={(e) => setTournaments(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
          />
        )}
        {showCountries && (
          <input
            type="text"
            className="border border-[#E9ECEF] rounded-lg px-3 py-2 text-[14px] w-[220px] focus:outline-none focus:border-[#1A56DB] focus:shadow-[0_0_0_3px_#E8F0FE]"
            placeholder="Countries (e.g. Brazil, Germany)"
            value={countries}
            onChange={(e) => setCountries(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && apply()}
          />
        )}
        {showDateRange && (
          <>
            <span className="text-[12px] font-semibold text-[#6C757D]">From</span>
            <input
              type="date"
              className="border border-[#E9ECEF] rounded-lg px-3 py-2 text-[14px] w-[150px] focus:outline-none focus:border-[#1A56DB] focus:shadow-[0_0_0_3px_#E8F0FE]"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
            <span className="text-[12px] font-semibold text-[#6C757D]">To</span>
            <input
              type="date"
              className="border border-[#E9ECEF] rounded-lg px-3 py-2 text-[14px] w-[150px] focus:outline-none focus:border-[#1A56DB] focus:shadow-[0_0_0_3px_#E8F0FE]"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </>
        )}
        <button
          onClick={apply}
          className="bg-[#1A56DB] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#0D3B9E]"
        >
          Apply
        </button>
        <button
          onClick={clear}
          className="border border-[#1A56DB] text-[#1A56DB] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#E8F0FE]"
        >
          Clear
        </button>
        {activeCount > 0 && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium bg-[#E8F0FE] text-[#1A56DB] border border-[#1A56DB]">
            {activeCount} active
            <X size={12} className="cursor-pointer" onClick={clear} />
          </span>
        )}
      </div>
    </div>
  );
}
