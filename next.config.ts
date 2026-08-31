import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@prisma/client"],
  experimental: {
    // Ảnh gốc từ điện thoại có thể nặng vài MB.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
