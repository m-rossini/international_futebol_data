/**
 * Server-side OpenObserve proxy for browser telemetry.
 *
 * The browser provider posts to the same-origin path /api/obs/<org>/<stream>/_json
 * (see lib/observability/openobserve-provider.ts) so that no credentials are ever
 * inlined into the browser bundle. This route forwards those requests to the
 * OpenObserve ingest/search API and injects the Basic auth header server-side.
 *
 * Why this exists: the 4 dashboards query the `web_events` stream for 46 of their
 * 49 panels. `web_events` is fed *only* by this proxy. If it 401s, every dashboard
 * renders empty. An earlier implementation lived in src/middleware.ts, where
 * streaming `request.body` with `duplex: 'half'` in the Edge runtime failed
 * ("fetch failed") even with valid credentials. A Node-runtime route handler can
 * buffer the body safely, so the middleware has been removed.
 *
 * OBS_BASIC_AUTH is a base64("user:password") string supplied at runtime by
 * docker-compose (and as a build-arg for the prod image in mk/deploy.mk).
 * OBS_PROXY_URL points at the OpenObserve API base. Both are server-only.
 */
import { NextRequest, NextResponse } from 'next/server';

const OBS_PROXY_URL =
  process.env.OBS_PROXY_URL ||
  process.env.NEXT_PUBLIC_OBS_PROXY_URL ||
  'http://openobserve:5080/api';
const OBS_BASIC_AUTH = process.env.OBS_BASIC_AUTH || '';

const OBS_PREFIX = '/api/obs/';

// Force the Node.js runtime so we can read the body safely (no Edge duplex streaming).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function proxy(request: NextRequest): Promise<NextResponse> {
  const rest = request.nextUrl.pathname.slice(OBS_PREFIX.length); // e.g. "default/web_events/_json"
  const target = `${OBS_PROXY_URL.replace(/\/$/, '')}/${rest}${request.nextUrl.search}`;

  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  if (OBS_BASIC_AUTH) {
    headers.set('authorization', `Basic ${OBS_BASIC_AUTH}`);
  }

  const method = request.method;
  const hasBody = method !== 'GET' && method !== 'HEAD';
  // Buffer the body in the Node runtime instead of streaming it.
  const body = hasBody ? await request.text() : undefined;

  try {
    const upstream = await fetch(target, {
      method,
      headers,
      body,
      cache: 'no-store',
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') || 'application/json' },
    });
  } catch {
    return new NextResponse('observability upstream unavailable', { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
