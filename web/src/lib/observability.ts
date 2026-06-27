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
