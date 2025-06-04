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
    // Dacă ai nevoie să expui prefix-ul în browser, îl poți păstra:
    NEXT_PUBLIC_FILE_ROUTE: process.env.FILE_ROUTE,
  },
  images: {
    // Adaugă aici domeniul MinIO
    domains: ["mysticgold.app", "bucket-production-71d6.up.railway.app"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "bucket-production-71d6.up.railway.app",
        // Dacă vrei să restrângi la un anumit pattern:
        pathname: "/avatars/**",
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

};

module.exports = nextConfig;
