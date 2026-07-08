'use client';

import { useEffect } from 'react';
import { sendMetric, incrementMetric } from '@/lib/observability';

// ---------------------------------------------------------------------------
//  Inline web vitals reporters (no external dependency)
// ---------------------------------------------------------------------------

/**
 * Reports Cumulative Layout Shift (CLS) via the PerformanceObserver API.
 */
function reportCLS() {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const cls = (entry as unknown as { value: number }).value;
        sendMetric('web_vital_cls', cls, 'score', { metric: 'CLS' });
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // PerformanceObserver not available
  }
}

/**
 * Reports Largest Contentful Paint (LCP).
 */
function reportLCP() {
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      if (entries.length > 0) {
        const lcp = entries[entries.length - 1];
        sendMetric('web_vital_lcp', lcp.startTime, 'ms', { metric: 'LCP' });
      }
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // PerformanceObserver not available
  }
}

/**
 * Reports First Input Delay (FID) / Interaction to Next Paint (INP).
 */
function reportFID() {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fid =
          (entry as unknown as { processingStart: number }).processingStart - entry.startTime;
        sendMetric('web_vital_fid', fid, 'ms', { metric: 'FID' });
      }
    });
    observer.observe({ type: 'first-input', buffered: true });
  } catch {
    // PerformanceObserver not available
  }
}

/**
 * Reports Time to First Byte (TTFB) from Navigation Timing.
 */
function reportTTFB() {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;
    if (nav) {
      sendMetric('web_vital_ttfb', nav.responseStart - nav.requestStart, 'ms', { metric: 'TTFB' });
    }
  } catch {
    // Navigation timing not available
  }
}

/**
 * Reports First Contentful Paint (FCP).
 */
function reportFCP() {
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        sendMetric('web_vital_fcp', entry.startTime, 'ms', { metric: 'FCP' });
      }
    });
    observer.observe({ type: 'paint', buffered: true });
  } catch {
    // PerformanceObserver not available
  }
}

/**
 * Reports DOM Content Loaded and Load events.
 */
function reportNavigationTiming() {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;
    if (nav) {
      sendMetric(
        'page_load_dom_content',
        nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
        'ms',
      );
      sendMetric('page_load_dom_complete', nav.domComplete, 'ms');
      sendMetric('page_load_total', nav.loadEventEnd - nav.startTime, 'ms');
    }
  } catch {
    // Navigation timing not available
  }
}

// ---------------------------------------------------------------------------
//  Component
// ---------------------------------------------------------------------------

/**
 * Web vitals tracker that reports CLS, LCP, FID, FCP, TTFB, and navigation
 * timing metrics to OpenObserve. Embed once in the root layout.
 */
export function WebVitalsTracker() {
  useEffect(() => {
    // Report initial page load count
    incrementMetric('page_load_count', 1, { page: window.location.pathname });

    // Web vitals (reported once on page load)
    reportCLS();
    reportLCP();
    reportFID();
    reportFCP();
    reportTTFB();
    reportNavigationTiming();
  }, []);

  return null;
}
