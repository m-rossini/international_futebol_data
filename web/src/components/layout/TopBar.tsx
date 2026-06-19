"use client";

import { usePathname } from "next/navigation";
import { Search } from "lucide-react";

const breadcrumbMap: Record<string, string> = {
  "/": "Dashboard",
  "/teams": "Teams",
  "/tournaments": "Tournaments",
  "/countries": "Countries",
  "/cities": "Cities",
  "/rankings": "Rankings",
  "/top-scorers": "Top Scorers",
  "/biggest-wins": "Biggest Wins",
  "/goals-per-year": "Goals Per Year",
  "/head-to-head": "Head-to-Head",
};

function getBreadcrumb(pathname: string): string {
  // Dynamic routes
  if (pathname.startsWith("/teams/") && pathname.split("/").length > 2) {
    return `Teams > ${decodeURIComponent(pathname.split("/teams/")[1])}`;
  }
  if (pathname.startsWith("/tournaments/") && pathname.split("/").length > 2) {
    return `Tournaments > ${decodeURIComponent(pathname.split("/tournaments/")[1])}`;
  }
  if (pathname.startsWith("/countries/") && pathname.split("/").length > 2) {
    return `Countries > ${decodeURIComponent(pathname.split("/countries/")[1])}`;
  }
  if (pathname.startsWith("/cities/") && pathname.split("/").length > 2) {
    return `Cities > ${decodeURIComponent(pathname.split("/cities/")[1])}`;
  }
  return breadcrumbMap[pathname] || pathname;
}

export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="h-[56px] bg-white border-b border-[#E9ECEF] flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2 text-[14px] text-[#6C757D]">
        <span>{getBreadcrumb(pathname)}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#ADB5BD]" />
          <input
            type="text"
            className="border border-[#E9ECEF] rounded-lg pl-9 pr-4 py-2 text-[14px] w-[220px] focus:outline-none focus:border-[#1A56DB] focus:shadow-[0_0_0_3px_#E8F0FE]"
            placeholder="Search..."
          />
        </div>
      </div>
    </header>
  );
}
