import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@rokade/core"],
  // @rokade/core is NodeNext-resolved TS: its imports say "./x.js" while the
  // files on disk are "./x.ts". Teach webpack the same extension mapping.
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
    };
    return config;
  },
};

export default nextConfig;
