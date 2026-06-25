"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AutocompleteInput } from "./AutocompleteInput";

interface FilterOptions {
  teams: string[];
  tournaments: string[];
  countries: string[];
}

interface Props {
  fields?: { teams?: boolean; tournaments?: boolean; countries?: boolean; dates?: boolean };
  children?: React.ReactNode;
}

const ALL_FIELDS: Required<Props["fields"]> = {
  teams: true,
  tournaments: true,
  countries: true,
  dates: true,
};

const FETCHED = new Map<string, FilterOptions>();

export function FilterBar({ fields, children }: Props) {
  const cfg = { ...ALL_FIELDS, ...fields };
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [options, setOptions] = useState<FilterOptions>(FETCHED.get("filters") || { teams: [], tournaments: [], countries: [] });

  useEffect(() => {
    if (FETCHED.has("filters")) return;
    let cancelled = false;
    fetch("/api/proxy/filters")
      .then((r) => r.json())
      .then((data: FilterOptions) => {
        if (!cancelled) {
          FETCHED.set("filters", data);
          setOptions(data);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const teams = sp.get("teams")?.split(",").filter(Boolean) || [];
  const tournaments = sp.get("tournaments")?.split(",").filter(Boolean) || [];
  const countries = sp.get("countries")?.split(",").filter(Boolean) || [];
  const dateFrom = sp.get("date_from") || "";
  const dateTo = sp.get("date_to") || "";

  const push = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(sp.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, sp]
  );

  const visible = Boolean(cfg.teams || cfg.tournaments || cfg.countries || cfg.dates || children);
  if (!visible) return null;

  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      {cfg.teams && (
        <div className="flex flex-col gap-1 min-w-[200px] max-w-[300px] flex-1">
          <label className="text-xs font-medium text-gray-500">Teams</label>
          <AutocompleteInput
            options={options.teams}
            selected={teams}
            onChange={(sel) => push("teams", sel.join(","))}
            placeholder="All teams"
          />
        </div>
      )}
      {cfg.tournaments && (
        <div className="flex flex-col gap-1 min-w-[200px] max-w-[300px] flex-1">
          <label className="text-xs font-medium text-gray-500">Tournaments</label>
          <AutocompleteInput
            options={options.tournaments}
            selected={tournaments}
            onChange={(sel) => push("tournaments", sel.join(","))}
            placeholder="All tournaments"
          />
        </div>
      )}
      {cfg.countries && (
        <div className="flex flex-col gap-1 min-w-[200px] max-w-[300px] flex-1">
          <label className="text-xs font-medium text-gray-500">Countries</label>
          <AutocompleteInput
            options={options.countries}
            selected={countries}
            onChange={(sel) => push("countries", sel.join(","))}
            placeholder="All countries"
          />
        </div>
      )}
      {cfg.dates && (
        <>
          <div className="flex flex-col gap-1 w-[140px]">
            <label className="text-xs font-medium text-gray-500">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => push("date_from", e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
            />
          </div>
          <div className="flex flex-col gap-1 w-[140px]">
            <label className="text-xs font-medium text-gray-500">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => push("date_to", e.target.value)}
              className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
            />
          </div>
        </>
      )}
      {children}
    </div>
  );
}
