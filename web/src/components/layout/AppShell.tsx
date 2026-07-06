'use client';

import { useState, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleClose = useCallback(() => setSidebarOpen(false), []);

  return (
    <>
      {/* Hamburger button — visible only on mobile */}
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className="fixed top-3 left-3 z-40 p-2 rounded-lg bg-white border border-gray-200 shadow-sm hover:bg-gray-50 lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} className="text-gray-600" />
      </button>

      <Sidebar isOpen={sidebarOpen} onClose={handleClose} />
      <main className="flex-1 min-w-0">{children}</main>
    </>
  );
}
