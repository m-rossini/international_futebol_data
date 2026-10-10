import type { NextConfig } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7531';
const OBS_PROXY_URL = process.env.NEXT_PUBLIC_OBS_PROXY_URL || 'http://openobserve:5080/api';

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${API_URL}/:path*`,
      },
      {
        source: '/api/oo/:path*',
        destination: `${OBS_PROXY_URL}/:path*`,
      },
      // NOTE: /api/obs/* is intentionally NOT a rewrite. It is served by the
      // Node-runtime route handler at src/app/api/obs/[...path]/route.ts, which
      // injects the OpenObserve Basic auth header. Rewrites run BEFORE route
      // handlers and cannot add an Authorization header, so leaving this rewrite
      // in place shadowed the route handler and every ingest returned 401.
    ];
  },
};

export default nextConfig;
