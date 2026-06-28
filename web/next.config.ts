import type { NextConfig } from 'next';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7531';

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
        destination: 'http://openobserve:5080/api/:path*',
      },
    ];
  },
};

export default nextConfig;
