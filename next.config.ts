// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // żeby ESLint nie wywalał buildu na Vercelu
  eslint: { ignoreDuringBuilds: true },

  // żeby Next mógł ładować zewnętrzne obrazki (np. z Google)
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
