/** @type {import('next').NextConfig} */
const nextConfig = {
  // Activează runtime-ul Node.js pentru App Router
  experimental: {
    runtime: 'nodejs',
  },

  // Ignoră erorile TS și ESLint în build (opțional)
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Încarcă variabile de mediu pentru client/server
  env: {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXT_PUBLIC_ZOOM_SDK_KEY: process.env.ZOOM_SDK_KEY,
    NEXT_PUBLIC_FILE_ROUTE: process.env.FILE_ROUTE,
  },

  // Configurație imagini (opțională în proiectul tău)
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

  // Headere globale pentru cross-origin isolation
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Deschide contextul către același origin
          { key: 'Cross-Origin-Opener-Policy',      value: 'same-origin' },            // :contentReference[oaicite:4]{index=4}
          // Permite încorporarea numai a resurselor cu CORP/CORS
          { key: 'Cross-Origin-Embedder-Policy',    value: 'require-corp' },           // :contentReference[oaicite:5]{index=5}
          // Specifică politica pentru orice resursă (WASM, worker, etc.)
          { key: 'Cross-Origin-Resource-Policy',    value: 'cross-origin' },           // :contentReference[oaicite:6]{index=6}
        ],
      },
    ];
  },
};

module.exports = nextConfig;
