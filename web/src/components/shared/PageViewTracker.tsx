'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { startTrace, endTrace, logPageView } from '@/lib/observability';

/**
 * Tracks page views via OpenObserve.
 * Starts a new trace for each page view and ends the previous one.
 * Embed this once in the root layout.
 *
 * Also emits a `page_view` event carrying `page`, `referrer` and
 * `previous_page`. The dashboards' "Top Referrers" and "Navigation Flow
 * (Previous → Current)" panels are built on exactly those fields, so without
 * this event both panels stay empty no matter how much traffic there is.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPath = useRef<string | null>(null);
  const hasStarted = useRef(false);

  // document.referrer is only meaningful on the first navigation of a session;
  // after that, "where the user came from" is the previous in-app route.
  const firstReferrer = useRef<string | null>(null);
  if (firstReferrer.current === null && typeof document !== 'undefined') {
    firstReferrer.current = document.referrer || null;
  }

  useEffect(() => {
    const path = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    if (path === prevPath.current) return;

    const previousPage = prevPath.current;

    // End previous trace if one exists
    if (hasStarted.current) {
      endTrace({ previous_page: previousPage ?? undefined });
    }

    prevPath.current = path;
    hasStarted.current = true;

    startTrace({
      page: pathname,
      url: path,
      search: searchParams.toString() || undefined,
    });

    // Only the first view of a session carries an external referrer; the
    // dashboards group by `referrer is not null and != ''`, so pass null
    // rather than an empty string when there isn't one.
    logPageView(path, previousPage === null ? firstReferrer.current : null, previousPage);
  }, [pathname, searchParams]);

  return null;
}
