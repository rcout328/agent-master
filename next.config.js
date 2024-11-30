/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['media1.thrillophilia.com', 'cdn.leonardo.ai'],
  },
}

module.exports = nextConfig