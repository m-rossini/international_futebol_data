/**
 * Client-side observability: sends structured event logs, traces and metrics
 * to the configured backend (OpenObserve, console, or no-op).
 *
 * All functions are fire-and-forget — they never throw and never block the UI.
 *
 * Provider is selected via NEXT_PUBLIC_OBS_PROVIDER env var:
 *   - 'openobserve' (default): sends to OpenObserve via JSON ingestion API
 *   - 'console': logs to browser console
 *   - 'noop': silent, no-op
 */

import { getProvider } from './observability/provider';
export type { ObservabilityProvider, TraceContext } from './observability/types';

export function logApiCall(
  endpoint: string,
  durationMs: number,
  status: number,
  context?: Record<string, unknown>,
) {
  getProvider().logApiCall(endpoint, durationMs, status, context);
}

export function logUserAction(action: string, context?: Record<string, unknown>) {
  getProvider().logUserAction(action, context);
}

export function sendMetric(
  metricName: string,
  value: number,
  unit: string,
  tags?: Record<string, string | number | boolean>,
) {
  getProvider().sendMetric(metricName, value, unit, tags);
}

export function incrementMetric(
  metricName: string,
  delta: number,
  tags?: Record<string, string | number | boolean>,
) {
  getProvider().incrementMetric(metricName, delta, tags);
}

export function startTrace(context?: Record<string, unknown>) {
  return getProvider().startTrace(context);
}

export function endTrace(context?: Record<string, unknown>) {
  getProvider().endTrace(context);
}
