'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { startTrace, endTrace } from '@/lib/observability';

/**
 * Tracks page views via OpenObserve.
 * Starts a new trace for each page view and ends the previous one.
 * Embed this once in the root layout.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPath = useRef<string | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    const path = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    if (path === prevPath.current) return;

    // End previous trace if one exists
    if (hasStarted.current) {
      endTrace({ previous_page: prevPath.current ?? undefined });
    }

    prevPath.current = path;
    hasStarted.current = true;

    startTrace({
      page: pathname,
      url: path,
      search: searchParams.toString() || undefined,
    });
  }, [pathname, searchParams]);

  return null;
}
