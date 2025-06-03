/** @type {import('next').NextConfig} */
const nextConfig = {
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
    // Dacă ai nevoie să expui prefix-ul & în browser:
    NEXT_PUBLIC_FILE_ROUTE: process.env.FILE_ROUTE,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/servicii/video",
        headers: [
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
  // AICI folosim variabila de mediu pentru rewrite
  async rewrites() {
    return [
      {
        source: `${process.env.FILE_ROUTE}/:path*`,
        destination: `/api/files/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
