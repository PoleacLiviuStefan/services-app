import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    typescript: {
    ignoreBuildErrors: true,
  },
  // 2) Ignore ESLint errors/warnings during production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXT_PUBLIC_ZOOM_SDK_KEY: process.env.ZOOM_SDK_KEY,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // Activează cross-origin isolation pentru pagina video Zoom
  async headers() {
    return [
      {
        source: '/servicii/video', // sau folosește '/servicii/video(.*)' dacă ai rute dinamice/subpagini
        headers: [
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
        ],
      },
    ];
  },
};

export default nextConfig;
