/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    runtime: 'nodejs',
    // Removed esmExternals for Turbopack compatibility
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

  // Headers pentru Zoom Video SDK
  async headers() {
    return [
      {
        source: '/servicii/video/sessions/:sessionid*',
        headers: [
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=*, microphone=*, display-capture=*' },
          // Additional headers pentru media access
          { key: 'Feature-Policy', value: 'camera *; microphone *; display-capture *' },
        ],
      },
    ];
  },

  // Simplified webpack config pentru Turbopack compatibility
  webpack: (config, { isServer }) => {
    // Only apply fallbacks for client-side
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
      };
    }

    // Basic handling for Zoom SDK modules
    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/@zoom/,
      type: 'javascript/auto',
    });

    return config;
  },

  // Basic optimizations that work with Turbopack
  swcMinify: true,
  compress: true,
  
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    poweredByHeader: false,
    generateEtags: false,
  }),
};

module.exports = nextConfig;