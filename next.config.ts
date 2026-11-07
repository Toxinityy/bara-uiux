import type { NextConfig } from 'next';

const apiBaseUrl = (process.env.API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  output: 'standalone',
  // Analysis and the next instruction can take longer than the default 30 seconds.
  experimental: { proxyTimeout: 95000 },
  async rewrites() {
    return [{ source: '/api/backend/:path*', destination: `${apiBaseUrl}/:path*` }];
  },
};

export default nextConfig;
