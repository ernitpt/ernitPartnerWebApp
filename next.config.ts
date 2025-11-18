import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    externalDir: true,
  },

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
