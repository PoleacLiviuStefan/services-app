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
      "lh3.googleusercontent.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "bucket-production-71d6.up.railway.app",
        pathname: "/avatars/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/servicii/video/sessions/:sessionid*',
        headers: [
          // enable COEP/COOP so you can embed cross-origin Daily.co
          { key: 'Cross-Origin-Opener-Policy',   value: 'same-origin' },
          { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
          { key: 'Cross-Origin-Resource-Policy', value: 'cross-origin' },

          // allow camera/mic/display-capture
          { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), display-capture=(self)' },

          // CSP so that Daily.co and your bucket are allowed
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self' mysticgold.app",
              "img-src     'self' https://bucket-production-71d6.up.railway.app https://lh3.googleusercontent.com data:",
              "script-src  'self' https://mysticgold.daily.co",
              "connect-src 'self' https://api.daily.co https://mysticgold.daily.co",
              "frame-src   'self' https://mysticgold.daily.co",
              "media-src   'self' https://mysticgold.daily.co",
            ].join('; ')
          }
        ]
      }
    ];
  },
  webpack: (config, { isServer }) => {
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

    config.module.rules.push({
      test: /\.js$/,
      include: /node_modules\/@zoom/,
      type: 'javascript/auto',
    });

    return config;
  },
  swcMinify: true,
  compress: true,
  ...(process.env.NODE_ENV === 'production' && {
    poweredByHeader: false,
    generateEtags: false,
  }),
};

module.exports = nextConfig;
