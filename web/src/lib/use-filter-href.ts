"use client";

import { useSearchParams } from "next/navigation";

/**
 * Returns a function that appends the current filter search params
 * (tournaments, countries, date_from, date_to) to a path.
 *
 * Usage:
 *   const to = useFilterHref();
 *   <Link href={to("/teams/Brazil")}>Brazil</Link>
 *   router.push(to("/teams/Brazil"))
 */
export function useFilterHref(): (path: string) => string {
  const sp = useSearchParams();
  const qs = buildFilterQs(sp);
  return (path: string) => {
    if (!qs) return path;
    return path + (path.includes("?") ? "&" : "?") + qs;
  };
}

function buildFilterQs(sp: ReturnType<typeof useSearchParams>): string {
  const parts: string[] = [];
  const tournaments = sp.get("tournaments");
  const countries = sp.get("countries");
  const date_from = sp.get("date_from");
  const date_to = sp.get("date_to");
  if (tournaments) parts.push(`tournaments=${encodeURIComponent(tournaments)}`);
  if (countries) parts.push(`countries=${encodeURIComponent(countries)}`);
  if (date_from) parts.push(`date_from=${encodeURIComponent(date_from)}`);
  if (date_to) parts.push(`date_to=${encodeURIComponent(date_to)}`);
  return parts.join("&");
}
