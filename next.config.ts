import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    externalDir: true,
  },

  // ✅ Allow local and LAN access during development
  allowedDevOrigins: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.66:3000",
  ],

  // ✅ Clean redirects (works in App Router)
  async redirects() {
    return [
      {
        source: "/",
        destination: "/login",
        permanent: false,
      },
      {
        source: "/partner-dashboard",
        destination: "/login",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
