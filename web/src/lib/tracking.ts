/**
 * Client-side tracking — sends structured events to OpenObserve.
 *
 * Events are batched and flushed periodically (every 5s or on page unload).
 * Proxied through Next.js API route to avoid CORS (OpenObserve POST
 * responses lack Access-Control-Allow-Origin headers).
 */

const INGEST_URL = "/api/ingest"; // same-origin proxy → OpenObserve
const BATCH_INTERVAL = 5000;

interface TrackEvent {
  _timestamp: number;
  type: string;
  [key: string]: unknown;
}

const buffer: TrackEvent[] = [];
let timer: ReturnType<typeof setInterval> | null = null;

async function flush(): Promise<void> {
  if (buffer.length === 0) return;
  const batch = buffer.splice(0);
  try {
    const res = await fetch(INGEST_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      console.warn("[tracking] ingest returned", res.status);
    }
  } catch (err) {
    console.warn("[tracking] flush failed:", err);
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
