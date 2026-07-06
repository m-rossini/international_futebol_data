'use client';

import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, Users, Trophy, Swords, Flag, TrendingUp, Clock } from 'lucide-react';
import { VERSION } from '@/lib/version';

const navItems = [
  { href: '/teams', label: 'Teams', icon: Users },
  { href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { href: '/head-to-head', label: 'Head to Head', icon: Swords },
  { href: '/flag-report', label: 'Flag Report', icon: Flag },
  { href: '/elo-ranking', label: 'ELO Rankings', icon: TrendingUp },
  { href: '/decade-leaders', label: 'Decade Leaders', icon: Clock },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Close on route change
  const handleNavClick = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <>
      {/* Backdrop overlay — mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — desktop: static sticky, mobile: fixed drawer */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200
          w-[270px] transition-transform duration-200 ease-in-out
          lg:static lg:translate-x-0 lg:w-[220px] lg:min-w-[220px]
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 lg:justify-start">
          <Link href="/" className="flex items-center gap-2" onClick={handleNavClick}>
            <span className="text-lg">⚽</span>
            <span className="font-semibold text-sm text-gray-800">Football Stats</span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
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
    </>
  );
}
