import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  // Dev-only overlay badge sits bottom-left and can overlap fixed-position
  // UI there (e.g. QuickAdd) during local testing — never shown in production.
  devIndicators: false,
};

export default nextConfig;
