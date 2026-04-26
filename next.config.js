/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['yahoo-finance2'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.yahoo.com',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // Exclude yahoo-finance2 test/Deno files that reference missing modules
    config.resolve.alias = {
      ...config.resolve.alias,
      '@std/testing/mock': false,
      '@std/testing/bdd': false,
      '@gadicc/fetch-mock-cache/runtimes/deno.ts': false,
      '@gadicc/fetch-mock-cache/stores/fs.ts': false,
    };

    // Ignore the fetchCache test file entirely
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /yahoo-finance2.*fetchCache\.js$/,
      use: 'null-loader',
    });

    return config;
  },
};

module.exports = nextConfig;
