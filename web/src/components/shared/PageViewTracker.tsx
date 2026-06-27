"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { logPageView } from "@/lib/observability";

/**
 * Tracks page views via OpenObserve.
 * Embed this once in the root layout — it subscribes to route changes automatically.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const prevPath = useRef<string | null>(null);

  useEffect(() => {
    const path = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    if (path === prevPath.current) return;
    prevPath.current = path;

    logPageView(pathname, {
      url: path,
      search: searchParams.toString() || undefined,
    });
  }, [pathname, searchParams]);

  return null;
}
