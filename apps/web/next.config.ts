import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@sidpro/ui', '@sidpro/types'],
  reactStrictMode: true,
};

export default nextConfig;
