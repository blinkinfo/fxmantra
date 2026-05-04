import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: ["privy.io"],
  },
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;
