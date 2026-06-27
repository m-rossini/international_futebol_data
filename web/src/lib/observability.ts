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
    const endpoint =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_OO_ENDPOINT
        : undefined;
    const org =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_OO_ORG
        : undefined;
    const stream =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_OO_STREAM
        : undefined;
    const basicAuth =
      typeof process !== "undefined"
        ? process.env.NEXT_PUBLIC_OO_BASIC_AUTH
        : undefined;

    if (!endpoint || !org || !stream || !basicAuth) return null;

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

function sendBatch(batch: LogEntry[]) {
  const config = getConfig();
  if (!config) return;

  const url = `${config.endpoint}/api/${config.org}/${config.stream}/_json`;

  fetch(url, {
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
 * Metrics are structured as gauge/counter data points and can
 * be queried and charted in OpenObserve.
 */
export function sendMetric(
  metricName: string,
  value: number,
  unit: string = "count",
  tags?: Record<string, string | number | boolean>,
) {
  sendLog("info", `metric:${metricName}`, {
    event_type: "metric",
    metric_name: metricName,
    metric_value: value,
    metric_unit: unit,
    metric_tags: tags ? JSON.stringify(tags) : undefined,
    ...tags,
  });
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
//  Tracing — W3C Trace Context
// ---------------------------------------------------------------------------

/**
 * Generate a 32-char hex trace ID (128-bit).
 */
function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a 16-char hex span ID (64-bit).
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

/**
 * Start a new root trace. Returns the trace context.
 * Call this when a new page view or top-level action begins.
 */
export function startTrace(context?: Record<string, unknown>): TraceContext {
  const traceId = generateTraceId();
  const spanId = generateSpanId();
  currentTrace = { traceId, spanId };

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
  const parentSpanId = currentTrace?.spanId ?? null;

  // If there's no active trace, this span becomes the root
  if (!currentTrace) {
    currentTrace = { traceId, spanId };
  }

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

  sendLog("info", `span:end:${name}`, {
    event_type: "span",
    trace_id: currentTrace.traceId,
    span_id: spanId,
    parent_span_id: currentTrace.spanId,
    span_name: name,
    span_action: "end",
    ...context,
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
    endSpan(spanId, name, { duration_ms: durationMs, ...context });
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
    endSpan(spanId, name, { duration_ms: durationMs, ...context });
  }
}
