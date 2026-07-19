'use client';

import { useEffect, useCallback, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X,
  Users,
  Trophy,
  Calendar,
  Swords,
  Flag,
  TrendingUp,
  Clock,
  MessageSquare,
} from 'lucide-react';
import { VERSION } from '@/lib/version';

type NavItem =
  { type: 'item'; href: string; label: string; icon: typeof Users } | { type: 'separator' };

const navItems: NavItem[] = [
  { type: 'item', href: '/teams', label: 'Teams', icon: Users },
  { type: 'item', href: '/tournaments', label: 'Tournaments', icon: Trophy },
  { type: 'item', href: '/years', label: 'Years', icon: Calendar },
  { type: 'item', href: '/head-to-head', label: 'Head to Head', icon: Swords },
  { type: 'separator' },
  { type: 'item', href: '/elo-ranking', label: 'ELO Rankings', icon: TrendingUp },
  { type: 'item', href: '/decade-leaders', label: 'Decade Leaders', icon: Clock },
  { type: 'separator' },
  { type: 'item', href: '/askme', label: 'Ask Me', icon: MessageSquare },
  { type: 'separator' },
  { type: 'item', href: '/house-keeping', label: 'House Keeping', icon: Flag },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: Props) {
  const pathname = usePathname();
  const [apiVersion, setApiVersion] = useState<string | null>(null);
  const [infraVersion, setInfraVersion] = useState<string | null>(null);

  // Fetch API and infra versions on mount
  useEffect(() => {
    fetch('/api/proxy/version')
      .then((r) => r.json())
      .then((data) => {
        setApiVersion(data.version);
        setInfraVersion(data.infra_version);
      })
      .catch(() => {
        setApiVersion('—');
        setInfraVersion('—');
      });
  }, []);

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

      {/* Sidebar — desktop: sticky, mobile: fixed drawer */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200
          w-[270px] transition-transform duration-200 ease-in-out
          lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:translate-x-0 lg:w-[220px] lg:min-w-[220px]
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
          {navItems.map((item, idx) => {
            if (item.type === 'separator') {
              return <hr key={`sep-${idx}`} className="my-2 border-gray-200" />;
            }
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
          <p>onegoodarea</p>
          <p>API v{apiVersion ?? '...'}</p>
          <p>INFRA v{infraVersion ?? '...'}</p>
          <p>WEB v{VERSION}</p>
        </div>
      </aside>
    </>
  );
}
