import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Désactiver ESLint temporairement pour le déploiement
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
