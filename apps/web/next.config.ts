import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@sidpro/ui', '@sidpro/types'],
  reactStrictMode: true,
};

export default nextConfig;
