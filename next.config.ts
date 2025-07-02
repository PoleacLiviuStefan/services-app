/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    runtime: 'nodejs',
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXT_PUBLIC_ZOOM_SDK_KEY: process.env.ZOOM_SDK_KEY,
    NEXT_PUBLIC_FILE_ROUTE: process.env.FILE_ROUTE,
  },
  images: {
    domains: [
      "mysticgold.app",
      "bucket-production-71d6.up.railway.app",
      "lh3.googleusercontent.com"
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bucket-production-71d6.up.railway.app",
        pathname: "/avatars/**",
      },
    ],
  },

  // aplica izolare COEP/COOP doar pentru /servicii/video/[sessionid]
  async headers() {
    return [
      {
        source: '/servicii/video/sessions/:sessionid*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
