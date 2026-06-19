import type { NextConfig } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7531";
const API_INTERNAL = process.env.API_URL || API_URL;

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: `${API_INTERNAL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
