"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { initTracking, trackPageView } from "@/lib/tracking";

export default function TrackingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initialized = useRef(false);

  // Init once
  useEffect(() => {
    if (!initialized.current) {
      initTracking();
      initialized.current = true;
    }
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      trackPageView(pathname);
    }
  }, [pathname]);

  return <>{children}</>;
}
