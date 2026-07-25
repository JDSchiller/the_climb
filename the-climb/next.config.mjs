/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/the_climb',
  assetPrefix: '/the_climb',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
