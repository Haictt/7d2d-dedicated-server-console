import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
  // Required when opening the dev server via Tailscale/LAN IP instead of localhost.
  // Without this, Next.js blocks JS bundles and Server Actions — buttons won't respond.
  allowedDevOrigins: [
    "100.101.64.25", // Tailscale IP (update if yours changes)
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
