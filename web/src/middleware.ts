import { NextResponse, type NextRequest } from 'next/server';

// Server-side proxy for browser → OpenObserve telemetry.
//
// The browser posts to the same-origin path /api/obs/<org>/... (no credentials
// in the client bundle). This middleware forwards those requests to the
// OpenObserve ingest API and injects the Basic auth header here, on the
// server, so the credentials are NEVER inlined into the browser JavaScript.
//
// OBS_PROXY_URL and OBS_BASIC_AUTH are supplied at build time (Dockerfile build
// args) and live only in the Next.js server runtime.

const OBS_PROXY_URL = process.env.NEXT_PUBLIC_OBS_PROXY_URL || 'http://openobserve:5080/api';
const OBS_BASIC_AUTH = process.env.OBS_BASIC_AUTH || '';

const OBS_PREFIX = '/api/obs/';

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith(OBS_PREFIX)) {
    return NextResponse.next();
  }

  const target = new URL(
    request.nextUrl.pathname.slice(OBS_PREFIX.length - 1) + request.nextUrl.search,
    OBS_PROXY_URL,
  ).toString();

  const headers = new Headers(request.headers);
  if (OBS_BASIC_AUTH) {
    headers.set('Authorization', `Basic ${OBS_BASIC_AUTH}`);
  }

  return fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    // Required for streaming request bodies in middleware.
    // @ts-expect-error - duplex is valid for fetch in the Node/edge runtime.
    duplex: 'half',
  });
}

export const config = {
  // Only run on the observability proxy prefix.
  matcher: ['/api/obs/:path*'],
};
