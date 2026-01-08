import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Redirects for module consolidation (ADR-005)
  async redirects() {
    return [
      {
        source: '/dashboard/market-alerts',
        destination: '/dashboard/alerts',
        permanent: true,
      },
      {
        source: '/market-alerts',
        destination: '/alerts',
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      // Add other image domains as needed
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
