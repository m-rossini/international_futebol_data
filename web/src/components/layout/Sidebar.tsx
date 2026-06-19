"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Users,
  Trophy,
  Globe,
  Building2,
  BarChart3,
  Goal,
  Target,
  TrendingUp,
  Swords,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/teams", label: "Teams", icon: Users },
  { href: "/tournaments", label: "Tournaments", icon: Trophy },
  { href: "/countries", label: "Countries", icon: Globe },
  { href: "/cities", label: "Cities", icon: Building2 },
  { href: "/rankings", label: "Rankings", icon: BarChart3 },
  { href: "/top-scorers", label: "Top Scorers", icon: Goal },
  { href: "/biggest-wins", label: "Biggest Wins", icon: Target },
  { href: "/goals-per-year", label: "Goals / Year", icon: TrendingUp },
  { href: "/head-to-head", label: "Head-to-Head", icon: Swords },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] min-w-[240px] bg-white border-r border-[#E9ECEF] flex flex-col h-screen sticky top-0">
      <div className="px-5 py-4 border-b border-[#E9ECEF]">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl">⚽</span>
          <span className="font-bold text-[15px] text-[#212529] leading-tight">
            Football<br />Stats
          </span>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                isActive
                  ? "bg-[#E8F0FE] text-[#1A56DB] font-semibold"
                  : "text-[#6C757D] hover:bg-[#F8F9FA]"
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
