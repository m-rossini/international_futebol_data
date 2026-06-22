"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { X } from "lucide-react";
import { FilterDropdown } from "./FilterDropdown";
import { getFilterOptions } from "@/lib/api";
import type { FilterOptions } from "@/lib/types";

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

  // Parse comma-separated URL params into arrays
  const parseParam = (key: string): string[] => {
    const val = searchParams.get(key) || "";
    return val ? val.split(",").map((s) => s.trim()).filter(Boolean) : [];
  };

  const [tournaments, setTournaments] = useState<string[]>(() => parseParam("tournaments"));
  const [countries, setCountries] = useState<string[]>(() => parseParam("countries"));
  const [dateFrom, setDateFrom] = useState(searchParams.get("date_from") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("date_to") || "");
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const optionsLoaded = useRef(false);

  // Load filter options once
  useEffect(() => {
    if (optionsLoaded.current) return;
    optionsLoaded.current = true;
    getFilterOptions()
      .then((o) => { setOptions(o); setOptionsLoading(false); })
      .catch(() => { setOptionsLoading(false); });
  }, []);

  const activeCount =
    (tournaments.length > 0 ? 1 : 0) +
    (countries.length > 0 ? 1 : 0) +
    (dateFrom ? 1 : 0) +
    (dateTo ? 1 : 0);

  const apply = useCallback(() => {
    const params = new URLSearchParams();
    if (tournaments.length > 0) params.set("tournaments", tournaments.join(","));
    if (countries.length > 0) params.set("countries", countries.join(","));
    if (dateFrom) params.set("date_from", dateFrom);
    if (dateTo) params.set("date_to", dateTo);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [router, pathname, tournaments, countries, dateFrom, dateTo]);

  const clear = useCallback(() => {
    setTournaments([]);
    setCountries([]);
    setDateFrom("");
    setDateTo("");
    router.push(pathname);
  }, [router, pathname]);

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[13px] font-semibold text-[#6C757D]">Filters:</span>
        {showTournaments && (
          <FilterDropdown
            id="filter-tournaments"
            label="Tournaments"
            options={options?.tournaments || []}
            selected={tournaments}
            onChange={setTournaments}
            loading={optionsLoading}
          />
        )}
        {showCountries && (
          <FilterDropdown
            id="filter-countries"
            label="Countries"
            options={options?.countries || []}
            selected={countries}
            onChange={setCountries}
            loading={optionsLoading}
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
