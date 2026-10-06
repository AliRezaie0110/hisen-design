import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET
    ?.trim()
    .replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!apiProxyTarget) {
      return [];
    }

    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;