import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Transpile workspace packages
  transpilePackages: [
    '@social-media-app/shared',
    '@social-media-app/auth-utils',
    '@social-media-app/dal',
  ],

  // Prevent Pino from being bundled (it needs to run in Node.js runtime)
  // This avoids "worker threads" errors with pino-pretty and pino transports
  serverExternalPackages: ['pino', 'pino-pretty'],

  // GraphQL server proxy
  async rewrites() {
    return [
      {
        source: '/graphql',
        destination: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
      },
    ];
  },

  // Image optimization (S3 presigned URLs)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4566', // LocalStack
      },
    ],
  },

  // React strict mode
  reactStrictMode: true,

  // Environment variables
  env: {
    NEXT_PUBLIC_GRAPHQL_URL: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  },
};

export default nextConfig;
