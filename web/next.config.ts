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
      {
        source: '/api/obs/:path*',
        destination: `${OBS_PROXY_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
