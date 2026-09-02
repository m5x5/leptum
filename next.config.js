const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Pins Turbopack's project root to avoid it mis-detecting the root by
  // walking up for a lockfile (causes "Next.js package not found" panics).
  turbopack: {
    root: __dirname,
  },
  // Dev-only: lets another local page fetch/validate this app cross-origin.
  // Not applied in production builds.
  async headers() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, PATCH, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: '*' },
        ],
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
