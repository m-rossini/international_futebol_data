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

export class NoopProvider implements ObservabilityProvider {
  logApiCall(): void {}
  logUserAction(): void {}
  sendMetric(): void {}
  incrementMetric(): void {}

  startTrace(): TraceContext {
    return { traceId: generateTraceId(), spanId: generateSpanId() };
  }

  endTrace(): void {}
}
