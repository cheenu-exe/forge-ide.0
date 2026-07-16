import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { imageHosts } from './image-hosts.config.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.DIST_DIR || '.next',
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  productionBrowserSourceMaps: true,
  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 60,
    qualities: [75, 85, 100],
  },
};

export default nextConfig;
