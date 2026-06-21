/**
 * Client-side tracking — sends structured events to OpenObserve.
 *
 * Events are batched and flushed periodically (every 5s or on page unload).
 * Disabled when NEXT_PUBLIC_OO_ENDPOINT is not set.
 */

const OO_ENDPOINT = process.env.NEXT_PUBLIC_OO_ENDPOINT;
const OO_BASIC_AUTH = process.env.NEXT_PUBLIC_OO_BASIC_AUTH;
const OO_ORG = process.env.NEXT_PUBLIC_OO_ORG || "default";
const OO_STREAM = process.env.NEXT_PUBLIC_OO_STREAM || "web_events";
const BATCH_INTERVAL = 5000;

interface TrackEvent {
  _timestamp: number;
  type: string;
  [key: string]: unknown;
}

const buffer: TrackEvent[] = [];
let timer: ReturnType<typeof setInterval> | null = null;
let enabled = false;

function getIngestUrl(): string {
  return `${OO_ENDPOINT}/api/${OO_ORG}/${OO_STREAM}/_json`;
}

async function flush(): Promise<void> {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0);
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (OO_BASIC_AUTH) headers["Authorization"] = `Basic ${OO_BASIC_AUTH}`;
    await fetch(getIngestUrl(), {
      method: "POST",
      headers,
      body: JSON.stringify(batch),
      // fire-and-forget
      keepalive: true,
    });
  } catch {
    // silently ignore — don't break the app
  }
}

function scheduleFlush(): void {
  if (timer) return;
  timer = setInterval(flush, BATCH_INTERVAL);
}

/**
 * Init tracking. Called once on app load.
 */
export function initTracking(): void {
  if (!OO_ENDPOINT) return;
  enabled = true;
  scheduleFlush();

  // Flush on page unload
  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", flush);
  }
}

/**
 * Track a generic event.
 */
export function track(type: string, data: Record<string, unknown> = {}): void {
  if (!enabled) return;
  buffer.push({
    _timestamp: Date.now() * 1000, // microseconds
    type,
    ...data,
  });
}

/**
 * Track a page view.
 */
export function trackPageView(path: string): void {
  track("page_view", {
    path,
    referrer: typeof document !== "undefined" ? document.referrer : "",
    title: typeof document !== "undefined" ? document.title : "",
  });
}

/**
 * Track an API call.
 */
export function trackApiCall(
  path: string,
  durationMs: number,
  status: number,
  error?: string
): void {
  track("api_call", {
    api_path: path,
    duration_ms: Math.round(durationMs),
    status,
    error: error || null,
  });
}

/**
 * Track a client-side error.
 */
export function trackError(message: string, stack?: string): void {
  track("error", {
    message,
    stack: stack || null,
  });
}
