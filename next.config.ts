import type { NextConfig } from "next";

const apiOrigin = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '');

if (process.env.NODE_ENV === 'production' && !apiOrigin) {
  throw new Error('NEXT_PUBLIC_API_URL is required for a production Arima build.');
}

const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    if (!apiOrigin) return [];

    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
