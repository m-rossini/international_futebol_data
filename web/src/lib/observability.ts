/**
 * Client-side observability: sends structured event logs, traces and metrics
 * to OpenObserve via the JSON ingestion API.
 *
 * All functions are fire-and-forget — they never throw and never block the UI.
 */

// ---------------------------------------------------------------------------
//  Configuration
// ---------------------------------------------------------------------------

interface OOConfig {
  endpoint: string;
  org: string;
  stream: string;
  authHeader: string;
}

function getConfig(): OOConfig | null {
  try {
    // NEXT_PUBLIC_* variables are inlined by Next.js at build time.
    // We access them carefully to avoid errors in environments
    // where process.env may not be fully available.
    //
    // When endpoint is empty, we use a same-origin relative path
    // (proxied by Next.js rewrites) to avoid CORS preflight issues.
    const endpoint =
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_OO_ENDPOINT) ??
      "";
    const org =
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_OO_ORG) ??
      "";
    const stream =
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_OO_STREAM) ??
      "";
    const basicAuth =
      (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_OO_BASIC_AUTH) ??
      "";

    if (!org || !stream || !basicAuth) return null;

    return {
      endpoint,
      org,
      stream,
      authHeader: `Basic ${basicAuth}`,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
//  Queue — batch logs and flush periodically
// ---------------------------------------------------------------------------

type LogEntry = Record<string, unknown>;

let queue: LogEntry[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

const FLUSH_INTERVAL_MS = 2000; // flush every 2s
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
  timer = setTimeout(flush, FLUSH_INTERVAL_MS);
}

function ooUrl(config: OOConfig, path: string): string {
  return config.endpoint
    ? `${config.endpoint}/api/${config.org}/${path}`
    : `/api/oo/${config.org}/${path}`;
}

function sendBatch(batch: LogEntry[]) {
  const config = getConfig();
  if (!config) return;

  fetch(ooUrl(config, `${config.stream}/_json`), {
    method: "POST",
    headers: {
      Authorization: config.authHeader,
      "Content-Type": "application/json",
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

let metricsQueue: MetricPoint[] = [];
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
  metricsTimer = setTimeout(flushMetrics, FLUSH_INTERVAL_MS);
}

function sendMetricsBatch(batch: MetricPoint[]) {
  const config = getConfig();
  if (!config) return;

  fetch(ooUrl(config, `ingest/metrics/_json`), {
    method: "POST",
    headers: {
      Authorization: config.authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(batch),
  }).catch(() => {
    // Silently ignore
  });
}

// ---------------------------------------------------------------------------
//  Core logging function
// ---------------------------------------------------------------------------

/**
 * Enqueue a log entry. Entries are batched and sent periodically.
 */
export function sendLog(
  level: string,
  message: string,
  context?: Record<string, unknown>,
) {
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

/**
 * Flush any pending log entries immediately.
 */
export function flushLogs() {
  flush();
}

// ---------------------------------------------------------------------------
//  Convenience loggers
// ---------------------------------------------------------------------------

/** Log a page view. */
export function logPageView(
  page: string,
  context?: Record<string, unknown>,
) {
  sendLog("info", `page_view:${page}`, {
    event_type: "page_view",
    page,
    ...context,
  });
  incrementMetric("page_view", 1, { page });
}

/** Log a user interaction (click, selection, etc.). */
export function logUserAction(
  action: string,
  context?: Record<string, unknown>,
) {
  sendLog("info", `user_action:${action}`, {
    event_type: "user_action",
    action,
    ...context,
  });
  incrementMetric("user_action", 1, { action });
}

/** Log an API call. */
export function logApiCall(
  endpoint: string,
  durationMs: number,
  status: number,
  context?: Record<string, unknown>,
) {
  sendLog("info", `api_call:${endpoint}`, {
    event_type: "api_call",
    api_endpoint: endpoint,
    duration_ms: durationMs,
    status,
    ...context,
  });
  incrementMetric("api_call", 1, { endpoint, status_category: status >= 400 ? "error" : "success" });
  recordTiming("api_call_duration", durationMs, { endpoint });
}

/** Log an error. */
export function logError(
  message: string,
  context?: Record<string, unknown>,
) {
  sendLog("error", message, {
    event_type: "error",
    ...context,
  });
  incrementMetric("error", 1, { error_message: message });
}

/** Log a form submission. */
export function logFormSubmit(
  formName: string,
  context?: Record<string, unknown>,
) {
  sendLog("info", `form_submit:${formName}`, {
    event_type: "form_submit",
    form_name: formName,
    ...context,
  });
}

// ---------------------------------------------------------------------------
//  Metrics
// ---------------------------------------------------------------------------

/**
 * Send a metric data point to OpenObserve.
 *
 * Logs an event to the web_events stream AND pushes a proper metric
 * data point to the metrics stream (visible in the Metrics tab).
 */
export function sendMetric(
  metricName: string,
  value: number,
  unit: string = "count",
  tags?: Record<string, string | number | boolean>,
) {
  // Log entry (visible in Logs tab)
  sendLog("info", `metric:${metricName}`, {
    event_type: "metric",
    metric_name: metricName,
    metric_value: value,
    metric_unit: unit,
    metric_tags: tags ? JSON.stringify(tags) : undefined,
    ...tags,
  });

  // Proper metric point (visible in Metrics tab)
  enqueueMetric(metricName, value, toMetricType(unit), tags);
}

function toMetricType(unit: string): string {
  if (unit === "ms" || unit === "histogram") return "histogram";
  if (unit === "count") return "counter";
  return "gauge";
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

/**
 * Convenience: increment a counter metric.
 * Sends value=1 by default; specify a different delta if needed.
 */
export function incrementMetric(
  metricName: string,
  delta: number = 1,
  tags?: Record<string, string | number | boolean>,
) {
  sendMetric(metricName, delta, "count", tags);
}

/**
 * Convenience: record a timing/histogram value (e.g. duration in ms).
 */
export function recordTiming(
  metricName: string,
  durationMs: number,
  tags?: Record<string, string | number | boolean>,
) {
  sendMetric(metricName, durationMs, "ms", tags);
}

// ---------------------------------------------------------------------------
//  Traces queue — sends OTLP JSON spans to OpenObserve traces endpoint
// ---------------------------------------------------------------------------

/**
 * Generates a 32-char hex trace ID (128-bit).
 */
function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generates a 16-char hex span ID (64-bit).
 */
function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface TraceContext {
  traceId: string;
  spanId: string;
}

let currentTrace: TraceContext | null = null;

/** Converts a kind string ("SERVER", "CLIENT", "INTERNAL") to OTLP kind int. */
function otelSpanKind(kind: string): number {
  switch (kind) {
    case "SERVER": return 2;
    case "CLIENT": return 3;
    case "PRODUCER": return 4;
    case "CONSUMER": return 5;
    default: return 1; // INTERNAL
  }
}

/** Converts context tags to OTLP attributes array. */
function toOtelAttrs(context?: Record<string, unknown>): Array<{ key: string; value: { stringValue: string } }> {
  if (!context) return [];
  return Object.entries(context).map(([key, val]) => ({
    key,
    value: { stringValue: String(val ?? "") },
  }));
}

// --- OTLP span queue ---
let spanQueue: any[] = [];
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
  spanTimer = setTimeout(flushSpans, FLUSH_INTERVAL_MS);
}

function sendSpanBatch(spans: any[]) {
  const config = getConfig();
  if (!config) return;

  const body = {
    resourceSpans: [{
      resource: {},
      scopeSpans: [{
        scope: {},
        spans,
      }],
    }],
  };

  fetch(ooUrl(config, `v1/traces`), {
    method: "POST",
    headers: {
      Authorization: config.authHeader,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }).catch(() => {
    // Silently ignore
  });
}

function enqueueOtelSpan(span: any) {
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

// --- Pending span start times ---
const pendingSpanStarts = new Map<string, number>();

// ---------------------------------------------------------------------------
//  Tracing — W3C Trace Context
// ---------------------------------------------------------------------------

/**
 * Start a new root trace. Returns the trace context.
 * Call this when a new page view or top-level action begins.
 */
export function startTrace(context?: Record<string, unknown>): TraceContext {
  const traceId = generateTraceId();
  const spanId = generateSpanId();
  currentTrace = { traceId, spanId };

  pendingSpanStarts.set(spanId, performance.now());

  sendLog("info", "trace:start", {
    event_type: "trace",
    trace_id: traceId,
    span_id: spanId,
    parent_span_id: null,
    span_name: "root",
    span_kind: "SERVER",
    trace_action: "start",
    ...context,
  });

  return currentTrace;
}

/**
 * End the current root trace.
 */
export function endTrace(context?: Record<string, unknown>) {
  if (!currentTrace) return;
  const now = performance.now();
  const t0 = pendingSpanStarts.get(currentTrace.spanId) ?? now;
  const durationMs = now - t0;
  pendingSpanStarts.delete(currentTrace.spanId);

  sendLog("info", "trace:end", {
    event_type: "trace",
    trace_id: currentTrace.traceId,
    span_id: currentTrace.spanId,
    parent_span_id: null,
    span_name: "root",
    span_kind: "SERVER",
    trace_action: "end",
    ...context,
  });

  // Push OTLP span
  const endNs = nowInNano();
  enqueueOtelSpan({
    traceId: currentTrace.traceId,
    spanId: currentTrace.spanId,
    parentSpanId: "",
    name: "root",
    kind: 2, // SERVER
    startTimeUnixNano: String(Math.round(endNs - durationMs * 1e6)),
    endTimeUnixNano: String(endNs),
    attributes: toOtelAttrs(context),
  });

  currentTrace = null;
}

/**
 * Create a child span within the current trace.
 * Returns the new span ID so the caller can end it later.
 */
export function startSpan(
  name: string,
  kind: string = "INTERNAL",
  context?: Record<string, unknown>,
): string {
  const traceId = currentTrace?.traceId ?? generateTraceId();
  const spanId = generateSpanId();
  const parentSpanId = currentTrace?.spanId ?? "";

  // If there's no active trace, this span becomes the root
  if (!currentTrace) {
    currentTrace = { traceId, spanId };
  }

  pendingSpanStarts.set(spanId, performance.now());

  sendLog("info", `span:start:${name}`, {
    event_type: "span",
    trace_id: traceId,
    span_id: spanId,
    parent_span_id: parentSpanId,
    span_name: name,
    span_kind: kind,
    span_action: "start",
    ...context,
  });

  return spanId;
}

/**
 * End a span.
 */
export function endSpan(
  spanId: string,
  name: string,
  context?: Record<string, unknown>,
) {
  if (!currentTrace) return;
  const now = performance.now();
  const t0 = pendingSpanStarts.get(spanId) ?? now;
  const durationMs = now - t0;
  pendingSpanStarts.delete(spanId);

  sendLog("info", `span:end:${name}`, {
    event_type: "span",
    trace_id: currentTrace.traceId,
    span_id: spanId,
    parent_span_id: currentTrace.spanId,
    span_name: name,
    span_action: "end",
    ...context,
  });

  // Push OTLP span
  const endNs = nowInNano();
  enqueueOtelSpan({
    traceId: currentTrace.traceId,
    spanId,
    parentSpanId: currentTrace.spanId,
    name,
    kind: otelSpanKind(context?.span_kind as string ?? "INTERNAL"),
    startTimeUnixNano: String(Math.round(endNs - durationMs * 1e6)),
    endTimeUnixNano: String(endNs),
    attributes: toOtelAttrs(context),
  });
}

/**
 * Get the current trace ID (for attaching to log events).
 */
export function getTraceId(): string | null {
  return currentTrace?.traceId ?? null;
}

/**
 * Get the current span ID.
 */
export function getSpanId(): string | null {
  return currentTrace?.spanId ?? null;
}

function nowInNano(): number {
  return Date.now() * 1_000_000;
}

/**
 * Run a callback wrapped in a child span.
 * Automatically creates and ends the span with timing.
 */
export function withSpan<T>(
  name: string,
  fn: () => T,
  kind: string = "INTERNAL",
  context?: Record<string, unknown>,
): T {
  const spanId = startSpan(name, kind, context);
  const t0 = performance.now();
  try {
    return fn();
  } finally {
    const durationMs = performance.now() - t0;
    endSpan(spanId, name, { duration_ms: durationMs, span_kind: kind, ...context });
  }
}

/**
 * Run an async callback wrapped in a child span.
 * Automatically creates and ends the span with timing.
 */
export async function withAsyncSpan<T>(
  name: string,
  fn: () => Promise<T>,
  kind: string = "INTERNAL",
  context?: Record<string, unknown>,
): Promise<T> {
  const spanId = startSpan(name, kind, context);
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    const durationMs = performance.now() - t0;
    endSpan(spanId, name, { duration_ms: durationMs, span_kind: kind, ...context });
  }
}
