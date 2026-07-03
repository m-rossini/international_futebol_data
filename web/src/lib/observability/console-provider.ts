import type { ObservabilityProvider, TraceContext } from './types';

function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

let currentTrace: TraceContext | null = null;

export class ConsoleProvider implements ObservabilityProvider {
  logApiCall(
    endpoint: string,
    durationMs: number,
    status: number,
    context?: Record<string, unknown>,
  ): void {
    console.log(`[api] ${endpoint}`, { durationMs, status, ...context });
  }

  logUserAction(action: string, context?: Record<string, unknown>): void {
    console.log(`[action] ${action}`, context);
  }

  sendMetric(
    metricName: string,
    value: number,
    unit: string,
    tags?: Record<string, string | number | boolean>,
  ): void {
    console.log(`[metric] ${metricName}`, { value, unit, ...tags });
  }

  incrementMetric(
    metricName: string,
    delta: number,
    tags?: Record<string, string | number | boolean>,
  ): void {
    this.sendMetric(metricName, delta, 'count', tags);
  }

  startTrace(context?: Record<string, unknown>): TraceContext {
    const traceId = generateTraceId();
    const spanId = generateSpanId();
    currentTrace = { traceId, spanId };
    console.log(`[trace:start]`, { traceId, spanId, ...context });
    return currentTrace;
  }

  endTrace(context?: Record<string, unknown>): void {
    if (!currentTrace) return;
    console.log(`[trace:end]`, {
      traceId: currentTrace.traceId,
      spanId: currentTrace.spanId,
      ...context,
    });
    currentTrace = null;
  }
}
