'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Users, Trophy, Swords, Flag, TrendingUp, Clock } from 'lucide-react';
import { VERSION } from '@/lib/version';

const navItems = [
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/head-to-head', label: 'Head to Head', icon: Swords },
  { href: '/flag-report', label: 'Flag Report', icon: Flag },
  { href: '/elo-ranking', label: 'ELO Rankings', icon: TrendingUp },
  { href: '/decade-leaders', label: 'Decade Leaders', icon: Clock },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] min-w-[220px] bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-gray-200">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-lg">⚽</span>
          <span className="font-semibold text-sm text-gray-800">Football Stats</span>
        </Link>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-4 py-3 border-t border-gray-200 text-[11px] text-gray-400 leading-relaxed">
        <p>&copy; Marcos Rossini</p>
        <p>onegoodarea &middot; v{VERSION}</p>
      </div>
    </aside>
  );
}
