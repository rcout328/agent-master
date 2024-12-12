/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ['js', 'jsx', 'ts', 'tsx'],
  webpack: (config, { isServer }) => {
    // Add marked to the list of node modules to transpile
    config.resolve.fallback = {
      ...config.resolve.fallback,
      marked: require.resolve('marked'),
    };
    return config;
  },
};

export default nextConfig;