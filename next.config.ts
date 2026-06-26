import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      { source: '/llms.txt', headers: [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }, { key: 'Cache-Control', value: 'public, max-age=3600' }] },
      { source: '/icon.svg', headers: [{ key: 'Cache-Control', value: 'public, max-age=604800, immutable' }] },
    ];
  },
};

export default nextConfig;
