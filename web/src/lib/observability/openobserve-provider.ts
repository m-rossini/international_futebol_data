import type { ObservabilityProvider, TraceContext } from './types';

// ---------------------------------------------------------------------------
//  Configuration
// ---------------------------------------------------------------------------

interface OOConfig {
  endpoint: string;
  org: string;
  stream: string;
}

function getConfig(): OOConfig | null {
  try {
    // NEXT_PUBLIC_* variables are inlined by Next.js at build time.
    // They MUST be accessed as process.env.NEXT_PUBLIC_* (without optional
    // chaining) so the webpack define plugin can replace them.  Using
    // process.env?.NEXT_PUBLIC_* breaks the pattern and leaves them as
    // undefined in the browser, silently disabling all telemetry.
    //
    // When endpoint is empty, we use a same-origin relative path
    // (/api/obs/<org>/...) proxied by Next.js rewrites. The OpenObserve
    // Basic auth is injected server-side by the rewrite (next.config),
    // so no credentials are ever inlined into the browser bundle.
    const endpoint = process.env.NEXT_PUBLIC_OBS_ENDPOINT || '';
    const org = process.env.NEXT_PUBLIC_OBS_ORG || '';
    const stream = process.env.NEXT_PUBLIC_OBS_STREAM || '';

    if (!org || !stream) return null;

    return {
      endpoint,
      org,
      stream,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
//  Queue — batch logs and flush periodically
// ---------------------------------------------------------------------------

type LogEntry = Record<string, unknown>;

const queue: LogEntry[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_INTERVAL = 2000; // flush every 2s
const MAX_BATCH = 50;

function flush() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;

  const batch = queue.splice(0, MAX_BATCH);
  sendBatch(batch);
}

function scheduleFlush() {
  if (timer) return;
  timer = setTimeout(flush, FLUSH_INTERVAL);
}

function ooUrl(config: OOConfig, path: string): string {
  return config.endpoint
    ? `${config.endpoint}/api/${config.org}/${path}`
    : `/api/obs/${config.org}/${path}`;
}

function sendBatch(batch: LogEntry[]) {
  const config = getConfig();
  if (!config) return;

  fetch(ooUrl(config, `${config.stream}/_json`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(batch),
  }).catch(() => {
    // Silently ignore — observability must never break the app
  });
}

// ---------------------------------------------------------------------------
//  Metrics queue — separate from logs, uses the metrics ingestion endpoint
// ---------------------------------------------------------------------------

interface MetricPoint {
  __name__: string;
  value: number;
  _timestamp: number;
  __type__: string;
  [tag: string]: unknown;
}

const metricsQueue: MetricPoint[] = [];
let metricsTimer: ReturnType<typeof setTimeout> | null = null;

function flushMetrics() {
  if (metricsTimer) {
    clearTimeout(metricsTimer);
    metricsTimer = null;
  }
  if (metricsQueue.length === 0) return;

  const batch = metricsQueue.splice(0, MAX_BATCH);
  sendMetricsBatch(batch);
}

function scheduleMetricsFlush() {
  if (metricsTimer) return;
  metricsTimer = setTimeout(flushMetrics, FLUSH_INTERVAL);
}

function sendMetricsBatch(batch: MetricPoint[]) {
  const config = getConfig();
  if (!config) return;

  fetch(ooUrl(config, `ingest/metrics/_json`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(batch),
  }).catch(() => {
    // Silently ignore
  });
}

// ---------------------------------------------------------------------------
//  Core logging
// ---------------------------------------------------------------------------

function sendLog(level: string, message: string, context?: Record<string, unknown>) {
  try {
    const entry: LogEntry = {
      _timestamp: new Date().toISOString(),
      level,
      message,
      ...context,
    };

    queue.push(entry);

    if (queue.length >= MAX_BATCH) {
      flush();
    } else {
      scheduleFlush();
    }
  } catch {
    // Never throw
  }
}

// ---------------------------------------------------------------------------
//  Metrics helpers
// ---------------------------------------------------------------------------

function toMetricType(unit: string): string {
  if (unit === 'ms' || unit === 'histogram') return 'histogram';
  if (unit === 'count') return 'counter';
  return 'gauge';
}

function enqueueMetric(
  name: string,
  value: number,
  type: string,
  tags?: Record<string, string | number | boolean>,
) {
  try {
    const point: MetricPoint = {
      __name__: name,
      value,
      _timestamp: Date.now() * 1000, // microseconds
      __type__: type,
      ...tags,
    };
    metricsQueue.push(point);

    if (metricsQueue.length >= MAX_BATCH) {
      flushMetrics();
    } else {
      scheduleMetricsFlush();
    }
  } catch {
    // Never throw
  }
}

function sendMetricData(
  metricName: string,
  value: number,
  unit: string,
  tags?: Record<string, string | number | boolean>,
) {
  sendLog('info', `metric:${metricName}`, {
    event_type: 'metric',
    metric_name: metricName,
    metric_value: value,
    metric_unit: unit,
    metric_tags: tags ? JSON.stringify(tags) : undefined,
    ...tags,
  });

  enqueueMetric(metricName, value, toMetricType(unit), tags);
}

// ---------------------------------------------------------------------------
//  Traces — OTLP JSON spans
// ---------------------------------------------------------------------------

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

function toOtelAttrs(
  context?: Record<string, unknown>,
): Array<{ key: string; value: { stringValue: string } }> {
  if (!context) return [];
  return Object.entries(context).map(([key, val]) => ({
    key,
    value: { stringValue: String(val ?? '') },
  }));
}

interface OtelSpan {
  traceId: string;
  spanId: string;
  parentSpanId: string;
  name: string;
  kind: number;
  startTimeUnixNano: string;
  endTimeUnixNano: string;
  attributes: Array<{ key: string; value: { stringValue: string } }>;
}

const spanQueue: OtelSpan[] = [];
let spanTimer: ReturnType<typeof setTimeout> | null = null;

function flushSpans() {
  if (spanTimer) {
    clearTimeout(spanTimer);
    spanTimer = null;
  }
  if (spanQueue.length === 0) return;

  const batch = spanQueue.splice(0, MAX_BATCH);
  sendSpanBatch(batch);
}

function scheduleSpanFlush() {
  if (spanTimer) return;
  spanTimer = setTimeout(flushSpans, FLUSH_INTERVAL);
}

function sendSpanBatch(spans: OtelSpan[]) {
  const config = getConfig();
  if (!config) return;

  const body = {
    resourceSpans: [
      {
        resource: {
          attributes: [{ key: 'service.name', value: { stringValue: 'futebol-web' } }],
        },
        scopeSpans: [
          {
            scope: {},
            spans,
          },
        ],
      },
    ],
  };

  fetch(ooUrl(config, `v1/traces`), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }).catch(() => {
    // Silently ignore
  });
}

function enqueueOtelSpan(span: OtelSpan) {
  try {
    spanQueue.push(span);
    if (spanQueue.length >= MAX_BATCH) {
      flushSpans();
    } else {
      scheduleSpanFlush();
    }
  } catch {
    // Never throw
  }
}

const pendingSpanStarts = new Map<string, number>();

function nowInNano(): number {
  return Date.now() * 1_000_000;
}

// ---------------------------------------------------------------------------
//  Provider implementation
// ---------------------------------------------------------------------------

let currentTrace: TraceContext | null = null;

export class OpenObserveProvider implements ObservabilityProvider {
  logApiCall(
    endpoint: string,
    durationMs: number,
    status: number,
    context?: Record<string, unknown>,
  ): void {
    sendLog('info', `api_call:${endpoint}`, {
      event_type: 'api_call',
      api_endpoint: endpoint,
      duration_ms: durationMs,
      status,
      ...context,
    });
    this.incrementMetric('api_call', 1, {
      endpoint,
      status_category: status >= 400 ? 'error' : 'success',
    });
    this.sendMetric('api_call_duration', durationMs, 'ms', { endpoint });
  }

  logUserAction(action: string, context?: Record<string, unknown>): void {
    sendLog('info', `user_action:${action}`, {
      event_type: 'user_action',
      action,
      ...context,
    });
    this.incrementMetric('user_action', 1, { action });
  }

  sendMetric(
    metricName: string,
    value: number,
    unit: string,
    tags?: Record<string, string | number | boolean>,
  ): void {
    sendMetricData(metricName, value, unit, tags);
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

    pendingSpanStarts.set(spanId, performance.now());

    sendLog('info', 'trace:start', {
      event_type: 'trace',
      trace_id: traceId,
      span_id: spanId,
      parent_span_id: null,
      span_name: 'root',
      span_kind: 'SERVER',
      trace_action: 'start',
      ...context,
    });

    return currentTrace;
  }

  endTrace(context?: Record<string, unknown>): void {
    if (!currentTrace) return;
    const now = performance.now();
    const t0 = pendingSpanStarts.get(currentTrace.spanId) ?? now;
    const durationMs = now - t0;
    pendingSpanStarts.delete(currentTrace.spanId);

    sendLog('info', 'trace:end', {
      event_type: 'trace',
      trace_id: currentTrace.traceId,
      span_id: currentTrace.spanId,
      parent_span_id: null,
      span_name: 'root',
      span_kind: 'SERVER',
      trace_action: 'end',
      ...context,
    });

    const endNs = nowInNano();
    enqueueOtelSpan({
      traceId: currentTrace.traceId,
      spanId: currentTrace.spanId,
      parentSpanId: '',
      name: 'root',
      kind: 2, // SERVER
      startTimeUnixNano: String(Math.round(endNs - durationMs * 1e6)),
      endTimeUnixNano: String(endNs),
      attributes: toOtelAttrs(context),
    });

    currentTrace = null;
  }
}
