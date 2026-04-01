import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@react-pdf/renderer'],
  async rewrites() {
    return [
      {
        source: '/grafana/:path*',
        destination: 'http://127.0.0.1:3001/:path*',
      },
    ]
  },
};

export default nextConfig;
