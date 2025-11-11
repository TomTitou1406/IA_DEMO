/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: true,
  },
  // Désactiver le pre-rendering pour les pages système
  generateBuildId: async () => {
    return 'diy-build'
  },
  // Force dynamic rendering
  output: 'standalone',
};

module.exports = nextConfig;
