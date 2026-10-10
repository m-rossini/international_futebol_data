export interface TraceContext {
  traceId: string;
  spanId: string;
}

export interface ObservabilityProvider {
  logApiCall(
    endpoint: string,
    durationMs: number,
    status: number,
    context?: Record<string, unknown>,
  ): void;

  logUserAction(action: string, context?: Record<string, unknown>): void;

  /**
   * Emits a `page_view` event carrying `page`, `referrer` and `previous_page`.
   * Dashboards 03 ("Top Referrers", "Navigation Flow") are built on these
   * fields, so without this method those panels stay permanently empty.
   */
  logPageView(page: string, referrer: string | null, previousPage: string | null): void;

  sendMetric(
    metricName: string,
    value: number,
    unit: string,
    tags?: Record<string, string | number | boolean>,
  ): void;

  incrementMetric(
    metricName: string,
    delta: number,
    tags?: Record<string, string | number | boolean>,
  ): void;

  startTrace(context?: Record<string, unknown>): TraceContext;

  endTrace(context?: Record<string, unknown>): void;
}
